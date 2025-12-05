import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaService } from './auditoria.service';
import { AlertasService } from './alertas.service';
import { AuditoriaAccion } from './auditoria-accion.entity';
import { AUDITABLE_KEY, AuditableMetadata } from './decorators/auditable.decorator';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditoriaInterceptor.name);
  private readonly requestCache = new Map<string, number>();
  private readonly CACHE_TTL = 2000; // 2 segundos para evitar duplicados

  constructor(
    private readonly reflector: Reflector,
    private readonly auditoriaService: AuditoriaService,
    private readonly alertasService: AlertasService,
    @InjectRepository(AuditoriaAccion)
    private readonly auditoriaRepository: Repository<AuditoriaAccion>,
  ) {
    // Limpiar cache periódicamente
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.requestCache.entries()) {
        if (now - timestamp > this.CACHE_TTL) {
          this.requestCache.delete(key);
        }
      }
    }, 5000); // Limpiar cada 5 segundos
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Verificar si el endpoint tiene el decorador @Auditable
    const metadata = this.reflector.get<AuditableMetadata>(
      AUDITABLE_KEY,
      context.getHandler(),
    );

    // Si no tiene el decorador, no auditar
    if (!metadata) {
      return next.handle();
    }

    // 🔥 OBTENER USUARIO
    const user = request.user;

    // 🚨 SI NO HAY USUARIO, SIMPLEMENTE NO AUDITAR
    if (!user) {
      this.logger.warn(`Intento de auditar sin usuario en: ${request.url}`);
      return next.handle();
    }

    // 🛡️ PROTECCIÓN CONTRA REGISTROS DUPLICADOS
    const requestKey = `${user.id}-${metadata.accion}-${metadata.modulo}-${request.url}-${request.method}`;
    const now = Date.now();
    const lastRequestTime = this.requestCache.get(requestKey);

    if (lastRequestTime && (now - lastRequestTime) < this.CACHE_TTL) {
      this.logger.debug(`⏭️ Request duplicado detectado y omitido: ${requestKey}`);
      return next.handle();
    }

    // Registrar este request en el cache
    this.requestCache.set(requestKey, now);

    // 🔍 DEBUG: Ver qué datos tiene el usuario
    this.logger.debug('📋 Usuario recibido del token:', JSON.stringify({
      id: user.id,
      username: user.username,
      nombres: user.nombres,
      apellidos: user.apellidos,
      rol: user.rol,
      'rol?.nombre': user.rol?.nombre
    }, null, 2));

    // Obtener información de la petición
    const ipAddress = this.obtenerIPReal(request);
    const userAgent = request.headers['user-agent'];

    // Datos del request
    const datosNuevos = this.extraerDatosRelevantes(request.body, request.query, request.params);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (responseData) => {
        const duration = Date.now() - startTime;

        try {
          // 🔧 COMPLETAR DATOS DEL USUARIO si no vienen en el token
          const userCompleto = await this.auditoriaService.completarDatosUsuario(user);

          // Generar descripción legible
          const descripcion = this.generarDescripcion(
            metadata,
            userCompleto,
            request,
            responseData,
          );

          // 🔥 REGISTRAR AUDITORÍA (sin campos eliminados)
          this.logger.debug(`📝 Registrando auditoría: ${metadata.accion}`);

          await this.auditoriaService.registrar({
            trabajadorId: userCompleto.id,
            accion: metadata.accion,
            modulo: metadata.modulo,
            descripcion,
            datosNuevos,
            ipAddress,
            userAgent,
          });

          // Evaluar y generar alertas si es necesario
          setImmediate(async () => {
            try {
              // Obtener la última auditoría CON la relación trabajador cargada
              const ultimaAuditoria = await this.auditoriaRepository.findOne({
                where: { trabajadorId: userCompleto.id },
                order: { fechaHora: 'DESC' },
                relations: ['trabajador'], // 👈 CRÍTICO para que funcione AlertasService
              });

              if (ultimaAuditoria) {
                await this.alertasService.evaluarYGenerarAlertas(ultimaAuditoria);
              }
            } catch (error) {
              this.logger.error('Error al evaluar alertas:', error);
            }
          });

          this.logger.debug(
            `✅ Auditoría registrada: ${metadata.modulo}.${metadata.accion} - ${user.username} (${user.rol?.nombre}) - ${duration}ms`,
          );
        } catch (error) {
          this.logger.error('❌ Error en interceptor de auditoría:', error);
        }
      }),
      catchError(async (error) => {
        // Completar datos del usuario para el registro de error
        const userCompleto = await this.auditoriaService.completarDatosUsuario(user);

        // Registrar también los errores
        const descripcion = this.generarDescripcion(
          metadata,
          userCompleto,
          request,
          null,
        );

        this.auditoriaService.registrar({
          trabajadorId: userCompleto.id,
          accion: metadata.accion,
          modulo: metadata.modulo,
          descripcion: `${descripcion} - ERROR: ${error.message}`,
          datosNuevos,
          ipAddress: this.obtenerIPReal(request),
          userAgent: request.headers['user-agent'],
        });

        return throwError(() => error);
      }),
    );
  }

  /**
   * Extrae el nombre del paciente de la respuesta o request
   */
  private extraerNombrePaciente(request: any, responseData: any): string {
    // Función helper para construir nombre completo
    const construirNombreCompleto = (obj: any): string | null => {
      if (!obj) return null;

      // Si ya viene nombre_completo
      if (obj.nombre_completo) return obj.nombre_completo;

      // Construir desde nombres y apellidos
      if (obj.nombres) {
        const apellidos = obj.apellidos ||
                         (obj.apellido_paterno || obj.apellido_materno
                           ? `${obj.apellido_paterno || ''} ${obj.apellido_materno || ''}`.trim()
                           : null);

        if (apellidos) {
          return `${obj.nombres} ${apellidos}`;
        }
        return obj.nombres;
      }

      return null;
    };

    // 1. Intentar desde responseData directo
    let nombre = construirNombreCompleto(responseData);
    if (nombre) return nombre;

    // 2. Desde responseData.paciente
    nombre = construirNombreCompleto(responseData?.paciente);
    if (nombre) return nombre;

    // 3. Desde responseData.pacienteServicio.paciente
    nombre = construirNombreCompleto(responseData?.pacienteServicio?.paciente);
    if (nombre) return nombre;

    // 4. Desde request.body
    nombre = construirNombreCompleto(request?.body);
    if (nombre) return nombre;

    return null;
  }

  /**
   * Genera una descripción legible de la acción
   */
  private generarDescripcion(
    metadata: AuditableMetadata,
    user: any,
    request: any,
    responseData: any,
  ): string {
    const nombreUsuario = `${user.nombres} ${user.apellidos}`;

    // Extraer nombre del paciente si está disponible
    const nombrePaciente = this.extraerNombrePaciente(request, responseData);
    const pacienteDescripcion = nombrePaciente ? ` del paciente ${nombrePaciente}` : ' de un paciente';

    const accionesDescripciones: Record<string, string> = {
      // AUDITORÍA
      VER_HISTORIAL: 'Consultó el historial de auditoría',
      VER_ESTADISTICAS: 'Consultó las estadísticas de auditoría',
      VER_ACTIVIDAD_USUARIO: 'Consultó la actividad de un usuario',
      VER_ALERTAS: 'Consultó las alertas del sistema',
      MARCAR_ALERTA_LEIDA: 'Marcó una alerta como leída',
      MARCAR_TODAS_ALERTAS_LEIDAS: 'Marcó todas las alertas como leídas',
      RESOLVER_ALERTA: 'Resolvió una alerta',

      // PACIENTES
      VER_PACIENTE: `Consultó el perfil${pacienteDescripcion}`,
      VER_LISTA_PACIENTES: 'Consultó el listado de pacientes',
      CREAR_PACIENTE: `Registró un nuevo paciente${nombrePaciente ? `: ${nombrePaciente}` : ''}`,
      EDITAR_PACIENTE: `Editó datos${pacienteDescripcion}`,
      EDITAR_FILIACION: `Editó datos de filiación${pacienteDescripcion}`,
      CAMBIAR_ESTADO_PACIENTE: `Cambió estado${pacienteDescripcion}`,
      CAMBIAR_VISIBILIDAD_PACIENTE: `Cambió visibilidad${pacienteDescripcion}`,

      // SERVICIOS Y TERAPIAS
      ASIGNAR_SERVICIO: `Asignó servicio${pacienteDescripcion}`,
      DESASIGNAR_SERVICIO: `Desasignó servicio${pacienteDescripcion}`,
      EDITAR_TERAPEUTA: `Editó terapeuta${pacienteDescripcion}`,

      // HISTORIA CLÍNICA Y EVOLUCIÓN
      CREAR_HISTORIA_CLINICA: `Creó historia clínica${pacienteDescripcion}`,
      EDITAR_HISTORIA_CLINICA: `Editó historia clínica${pacienteDescripcion}`,
      CREAR_NOTA_EVOLUCION: `Creó nota de evolución${pacienteDescripcion}`,
      CREAR_REPORTE_EVOLUCION: `Creó reporte de evolución${pacienteDescripcion}`,
      EDITAR_REPORTE_EVOLUCION: `Editó reporte de evolución${pacienteDescripcion}`,
      CREAR_ENTREVISTA_PADRES: `Creó entrevista a padres${pacienteDescripcion}`,
      EDITAR_ENTREVISTA_PADRES: `Editó entrevista a padres${pacienteDescripcion}`,
      CREAR_EVALUACION_TERAPIA: `Creó evaluación de terapia ocupacional${pacienteDescripcion}`,
      EDITAR_EVALUACION_TERAPIA: `Editó evaluación de terapia ocupacional${pacienteDescripcion}`,

      // ARCHIVOS DIGITALES
      SUBIR_ARCHIVO: `Subió archivo digital${pacienteDescripcion}`,
      ABRIR_ARCHIVO: `Abrió archivo digital${pacienteDescripcion}`,
      DESCARGAR_ARCHIVO: `Descargó archivo digital${pacienteDescripcion}`,
      ELIMINAR_ARCHIVO: `Eliminó archivo digital${pacienteDescripcion}`,

      // CITAS
      VER_AGENDA: 'Consultó la agenda de citas',
      CREAR_CITA: 'Creó una nueva cita',
      EDITAR_CITA: 'Editó una cita',
      ELIMINAR_CITA: 'Eliminó una cita',

      // CERTIFICADOS Y OTROS ARCHIVOS
      CREAR_CERTIFICADO: 'Creó un certificado oficial',
      VER_CERTIFICADO: 'Consultó un certificado',

      // EMPLEADOS
      VER_EMPLEADO: 'Consultó datos de un empleado',
      CREAR_EMPLEADO: 'Registró un nuevo empleado',
      EDITAR_EMPLEADO: 'Editó datos de un empleado',
      ELIMINAR_EMPLEADO: 'Eliminó a un empleado',

      // RECURSOS HUMANOS
      CALCULAR_GRATIFICACION: 'Calculó gratificación para un empleado',
      REGISTRAR_PAGO: 'Registró un pago para un empleado',
      REGISTRAR_VACACION: 'Registró vacaciones para un empleado',

      // POSTULACIONES
      VER_POSTULACION: 'Consultó una postulación',
      CAMBIAR_ESTADO_POSTULACION: 'Cambió estado de una postulación',
      AGREGAR_COMENTARIO: 'Agregó un comentario a una postulación',

      // SISTEMA
      EXPORTAR_DATOS: `Exportó datos del módulo ${metadata.modulo}`,
      LOGIN: 'Inició sesión en el sistema',
      LOGOUT: 'Cerró sesión',
    };

    return accionesDescripciones[metadata.accion] ||
           `Realizó la acción ${metadata.accion} en ${metadata.modulo}`;
  }

  /**
   * Extrae datos relevantes del request (sin datos sensibles)
   */
  private extraerDatosRelevantes(body: any, query: any, params: any): any {
    const datos: any = {};

    if (body && typeof body === 'object') {
      const bodyLimpio = { ...body };
      delete bodyLimpio.password;
      delete bodyLimpio.passwordConfirm;
      delete bodyLimpio.currentPassword;
      delete bodyLimpio.newPassword;

      if (Object.keys(bodyLimpio).length > 0) {
        datos.body = bodyLimpio;
      }
    }

    if (query && Object.keys(query).length > 0) {
      datos.query = query;
    }

    if (params && Object.keys(params).length > 0) {
      datos.params = params;
    }

    return Object.keys(datos).length > 0 ? datos : null;
  }

  /**
   * Obtiene la IP real del cliente
   */
  private obtenerIPReal(request: any): string {
    let ip = 'IP desconocida';

    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
      if (ips.length > 0 && ips[0]) {
        ip = ips[0];
      }
    }

    if (!ip || ip === 'IP desconocida') {
      const realIp = request.headers['x-real-ip'];
      if (realIp) {
        ip = realIp;
      }
    }

    if (!ip || ip === 'IP desconocida') {
      const cfIp = request.headers['cf-connecting-ip'];
      if (cfIp) {
        ip = cfIp;
      }
    }

    if (!ip || ip === 'IP desconocida') {
      const clientIp = request.headers['x-client-ip'];
      if (clientIp) {
        ip = clientIp;
      }
    }

    if (!ip || ip === 'IP desconocida') {
      if (request.ip) {
        ip = request.ip.replace(/^::ffff:/, '');
      }
    }

    if (!ip || ip === 'IP desconocida') {
      const remoteAddress = request.connection?.remoteAddress ||
                           request.socket?.remoteAddress;
      if (remoteAddress) {
        ip = remoteAddress.replace(/^::ffff:/, '');
      }
    }

    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      const forwarded = request.headers['x-forwarded-for'];
      if (forwarded) {
        return `${ip} (proxy: ${forwarded})`;
      }
      return `${ip} (localhost)`;
    }

    return ip;
  }
}