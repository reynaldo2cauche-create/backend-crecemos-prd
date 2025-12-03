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
import { AuditoriaService } from './auditoria.service';
import { AlertasService } from './alertas.service';
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

    // 🔥 OBTENER USUARIO - AHORA FUNCIONA PARA TODOS
    const user = request.user;

    // 🚨 SI NO HAY USUARIO, SIMPLEMENTE NO AUDITAR (endpoints públicos o sin auth)
    // Pero TODOS los endpoints con @Auditable deberían tener autenticación
    if (!user) {
      this.logger.warn(`Intento de auditar sin usuario en: ${request.url}`);
      return next.handle();
    }

    // 🛡️ PROTECCIÓN CONTRA REGISTROS DUPLICADOS
    // Generar una clave única para este request basada en usuario, acción, endpoint y tiempo
    const requestKey = `${user.id}-${metadata.accion}-${metadata.modulo}-${request.url}-${request.method}`;
    const now = Date.now();
    const lastRequestTime = this.requestCache.get(requestKey);

    // Si ya existe un registro reciente (dentro de CACHE_TTL), no auditar
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
    const metodoHttp = request.method;
    const endpoint = request.url;
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

          // Extraer información de la entidad afectada
          const entidadInfo = this.extraerInfoEntidad(metadata, request, responseData);

          // Generar descripción legible
          const descripcion = this.generarDescripcion(
            metadata,
            userCompleto,
            entidadInfo,
            metodoHttp,
          );

          // 🔥 REGISTRAR AUDITORÍA - ESTO SE EJECUTA PARA TODOS LOS USUARIOS
          this.logger.debug(`📝 Registrando auditoría: ${metadata.accion} - Entidad: ${entidadInfo.id} "${entidadInfo.nombre}"`);

          await this.auditoriaService.registrar({
            trabajadorId: userCompleto.id,
            trabajadorNombre: `${userCompleto.nombres} ${userCompleto.apellidos}`,
            trabajadorUsername: userCompleto.username,
            trabajadorRol: userCompleto.rol?.nombre || 'Sin rol',
            accion: metadata.accion,
            modulo: metadata.modulo,
            entidadTipo: metadata.entidadTipo || null,
            entidadId: entidadInfo.id,
            entidadNombre: entidadInfo.nombre,
            descripcion,
            datosAnteriores: null,
            datosNuevos,
            ipAddress,
            userAgent,
            metodoHttp,
            endpoint,
            codigoRespuesta: response.statusCode,
          });

          // Evaluar y generar alertas si es necesario
          setImmediate(async () => {
            try {
              const ultimasAcciones = await this.auditoriaService.obtenerActividadUsuario(user.id, 1);
              if (ultimasAcciones.length > 0) {
                await this.alertasService.evaluarYGenerarAlertas(ultimasAcciones[0]);
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
          { id: null, nombre: null },
          metodoHttp,
        );

        this.auditoriaService.registrar({
          trabajadorId: userCompleto.id,
          trabajadorNombre: `${userCompleto.nombres} ${userCompleto.apellidos}`,
          trabajadorUsername: userCompleto.username,
          trabajadorRol: userCompleto.rol?.nombre || 'Sin rol',
          accion: metadata.accion,
          modulo: metadata.modulo,
          entidadTipo: metadata.entidadTipo || null,
          entidadId: null,
          entidadNombre: null,
          descripcion: `${descripcion} - ERROR: ${error.message}`,
          datosAnteriores: null,
          datosNuevos,
          ipAddress,
          userAgent,
          metodoHttp,
          endpoint,
          codigoRespuesta: error.status || 500,
        });

        return throwError(() => error);
      }),
    );
  }

  /**
   * Extrae información de la entidad afectada
   */
  private extraerInfoEntidad(
    metadata: AuditableMetadata,
    request: any,
    responseData: any,
  ): { id: number | null; nombre: string | null } {
    let id: number | null = null;
    let nombre: string | null = null;

    // 1️⃣ Prioridad: Si se especificó entidadIdParam, buscar en params
    if (metadata.entidadIdParam && request.params?.[metadata.entidadIdParam]) {
      id = parseInt(request.params[metadata.entidadIdParam]);
    }
    // 2️⃣ Si se especificó entidadIdBody, buscar en body
    else if (metadata.entidadIdBody && request.body?.[metadata.entidadIdBody]) {
      id = parseInt(request.body[metadata.entidadIdBody]);
    }
    // 3️⃣ Si se especificó entidadIdResponse, buscar en respuesta (soporta rutas anidadas)
    else if (metadata.entidadIdResponse && responseData) {
      id = this.obtenerValorAnidado(responseData, metadata.entidadIdResponse);
    }
    // 4️⃣ Comportamiento por defecto: buscar en params.id o responseData.id
    else {
      if (request.params?.id) {
        id = parseInt(request.params.id);
      }
      if (!id && responseData?.id) {
        id = responseData.id;
      }
    }

    // Extraer el nombre según el tipo de entidad
    if (metadata.entidadTipo === 'Paciente') {
      // Función auxiliar para construir el nombre completo
      const construirNombreCompleto = (obj: any) => {
        if (obj?.nombre_completo) return obj.nombre_completo;

        if (obj?.nombres) {
          // Probar diferentes combinaciones de apellidos
          const apellidos = obj.apellidos ||
                          (obj.apellido_paterno || obj.apellido_materno
                            ? `${obj.apellido_paterno || ''} ${obj.apellido_materno || ''}`.trim()
                            : null);

          if (apellidos) {
            return `${obj.nombres} ${apellidos}`;
          }
        }
        return null;
      };

      // 1. Intentar desde el responseData directo (para GET /pacientes/:id, PATCH /pacientes/:id)
      nombre = construirNombreCompleto(responseData);

      // 2. Si no, buscar en responseData.paciente (para servicios, asignaciones)
      if (!nombre && responseData?.paciente) {
        nombre = construirNombreCompleto(responseData.paciente);
      }

      // 3. Si no, buscar en responseData.pacienteServicio.paciente (para historia clínica)
      if (!nombre && responseData?.pacienteServicio?.paciente) {
        nombre = construirNombreCompleto(responseData.pacienteServicio.paciente);
      }
    } else if (metadata.entidadTipo === 'TrabajadorCentro') {
      nombre = responseData?.nombres && responseData?.apellidos
        ? `${responseData.nombres} ${responseData.apellidos}`
        : null;
    } else if (metadata.entidadTipo === 'Cita') {
      nombre = responseData?.motivo || `Cita #${id}`;
    } else if (responseData?.nombre) {
      nombre = responseData.nombre;
    }

    return { id, nombre };
  }

  /**
   * Obtiene un valor anidado de un objeto usando notación de puntos
   * Ej: obtenerValorAnidado(obj, 'paciente.id') -> obj.paciente.id
   */
  private obtenerValorAnidado(obj: any, path: string): number | null {
    try {
      const valor = path.split('.').reduce((o, key) => o?.[key], obj);
      return valor ? parseInt(valor) : null;
    } catch {
      return null;
    }
  }

  /**
   * Genera una descripción legible de la acción
   */
  private generarDescripcion(
    metadata: AuditableMetadata,
    user: any,
    entidadInfo: { id: number | null; nombre: string | null },
    metodoHttp: string,
  ): string {
    const nombreUsuario = `${user.nombres} ${user.apellidos}`;
    const entidadDescripcion = entidadInfo.nombre
      ? `"${entidadInfo.nombre}"`
      : entidadInfo.id
        ? `#${entidadInfo.id}`
        : '';

    const accionesDescripciones: Record<string, string> = {
      // AUDITORÍA
      VER_HISTORIAL: 'Consultó el historial de auditoría',
      VER_HISTORIAL_ENTIDAD: `Consultó el historial de ${metadata.entidadTipo} ${entidadDescripcion}`,
      VER_ESTADISTICAS: 'Consultó las estadísticas de auditoría',
      VER_ACTIVIDAD_USUARIO: 'Consultó la actividad de un usuario',
      VER_ALERTAS: 'Consultó las alertas del sistema',
      MARCAR_ALERTA_LEIDA: 'Marcó una alerta como leída',
      MARCAR_TODAS_ALERTAS_LEIDAS: 'Marcó todas las alertas como leídas',
      RESOLVER_ALERTA: 'Resolvió una alerta',

      // PACIENTES
      VER_PACIENTE: `Consultó el perfil del paciente ${entidadDescripcion}`,
      VER_LISTA_PACIENTES: 'Consultó el listado de pacientes',
      CREAR_PACIENTE: `Registró un nuevo paciente ${entidadDescripcion}`,
      EDITAR_PACIENTE: `Editó datos del paciente ${entidadDescripcion}`,
      EDITAR_FILIACION: `Editó datos de filiación del paciente ${entidadDescripcion}`,
      CAMBIAR_ESTADO_PACIENTE: `Cambió estado del paciente ${entidadDescripcion}`,
      CAMBIAR_VISIBILIDAD_PACIENTE: `Cambió visibilidad del paciente ${entidadDescripcion}`,

      // SERVICIOS Y TERAPIAS
      ASIGNAR_SERVICIO: `Asignó servicio al paciente ${entidadDescripcion}`,
      DESASIGNAR_SERVICIO: `Desasignó servicio del paciente ${entidadDescripcion}`,
      EDITAR_TERAPEUTA: `Editó terapeuta del paciente ${entidadDescripcion}`,

      // HISTORIA CLÍNICA Y EVOLUCIÓN
      CREAR_HISTORIA_CLINICA: `Creó historia clínica del paciente ${entidadDescripcion}`,
      EDITAR_HISTORIA_CLINICA: `Editó historia clínica del paciente ${entidadDescripcion}`,
      CREAR_NOTA_EVOLUCION: `Creó nota de evolución del paciente ${entidadDescripcion}`,
      CREAR_REPORTE_EVOLUCION: `Creó reporte de evolución del paciente ${entidadDescripcion}`,
      EDITAR_REPORTE_EVOLUCION: `Editó reporte de evolución del paciente ${entidadDescripcion}`,
      CREAR_ENTREVISTA_PADRES: `Creó entrevista a padres del paciente ${entidadDescripcion}`,
      EDITAR_ENTREVISTA_PADRES: `Editó entrevista a padres del paciente ${entidadDescripcion}`,
      CREAR_EVALUACION_TERAPIA: `Creó evaluación de terapia ocupacional del paciente ${entidadDescripcion}`,
      EDITAR_EVALUACION_TERAPIA: `Editó evaluación de terapia ocupacional del paciente ${entidadDescripcion}`,

      // ARCHIVOS DIGITALES
      SUBIR_ARCHIVO: `Subió archivo digital del paciente ${entidadDescripcion}`,
      ABRIR_ARCHIVO: `Abrió archivo digital del paciente ${entidadDescripcion}`,
      DESCARGAR_ARCHIVO: `Descargó archivo digital del paciente ${entidadDescripcion}`,
      ELIMINAR_ARCHIVO: `Eliminó archivo digital del paciente ${entidadDescripcion}`,

      // CITAS
      VER_AGENDA: 'Consultó la agenda de citas',
      CREAR_CITA: `Creó una nueva cita ${entidadDescripcion}`,
      EDITAR_CITA: `Editó la cita ${entidadDescripcion}`,
      ELIMINAR_CITA: `Eliminó la cita ${entidadDescripcion}`,

      // CERTIFICADOS Y OTROS ARCHIVOS
      CREAR_CERTIFICADO: `Creó un certificado oficial ${entidadDescripcion}`,
      VER_CERTIFICADO: `Consultó el certificado ${entidadDescripcion}`,

      // EMPLEADOS
      VER_EMPLEADO: `Consultó datos del empleado ${entidadDescripcion}`,
      CREAR_EMPLEADO: `Registró un nuevo empleado ${entidadDescripcion}`,
      EDITAR_EMPLEADO: `Editó datos del empleado ${entidadDescripcion}`,
      ELIMINAR_EMPLEADO: `Eliminó al empleado ${entidadDescripcion}`,

      // RECURSOS HUMANOS
      CALCULAR_GRATIFICACION: `Calculó gratificación para el empleado ${entidadDescripcion}`,
      REGISTRAR_PAGO: `Registró un pago para el empleado ${entidadDescripcion}`,
      REGISTRAR_VACACION: `Registró vacaciones para el empleado ${entidadDescripcion}`,

      // POSTULACIONES
      VER_POSTULACION: `Consultó la postulación ${entidadDescripcion}`,
      CAMBIAR_ESTADO_POSTULACION: `Cambió estado de la postulación ${entidadDescripcion}`,
      AGREGAR_COMENTARIO: `Agregó un comentario a la postulación ${entidadDescripcion}`,

      // SISTEMA
      EXPORTAR_DATOS: `Exportó datos del módulo ${metadata.modulo}`,
      LOGIN: 'Inició sesión en el sistema',
      LOGOUT: 'Cerró sesión',
    };

    return accionesDescripciones[metadata.accion] ||
           `Realizó la acción ${metadata.accion} en ${metadata.modulo} ${entidadDescripcion}`;
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
   * Obtiene la IP real del cliente, considerando proxies y balanceadores de carga
   */
  private obtenerIPReal(request: any): string {
    let ip = 'IP desconocida';

    // 1. Verificar header X-Forwarded-For (estándar de proxies)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For puede contener múltiples IPs separadas por coma
      // La primera IP es la del cliente original
      const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
      if (ips.length > 0 && ips[0]) {
        ip = ips[0];
      }
    }

    // 2. Verificar header X-Real-IP (usado por Nginx)
    if (!ip || ip === 'IP desconocida') {
      const realIp = request.headers['x-real-ip'];
      if (realIp) {
        ip = realIp;
      }
    }

    // 3. Verificar header CF-Connecting-IP (Cloudflare)
    if (!ip || ip === 'IP desconocida') {
      const cfIp = request.headers['cf-connecting-ip'];
      if (cfIp) {
        ip = cfIp;
      }
    }

    // 4. Verificar header X-Client-IP
    if (!ip || ip === 'IP desconocida') {
      const clientIp = request.headers['x-client-ip'];
      if (clientIp) {
        ip = clientIp;
      }
    }

    // 5. Usar request.ip (funciona con trust proxy habilitado)
    if (!ip || ip === 'IP desconocida') {
      if (request.ip) {
        // Limpiar el formato IPv6 localhost
        ip = request.ip.replace(/^::ffff:/, '');
      }
    }

    // 6. Fallback a connection.remoteAddress
    if (!ip || ip === 'IP desconocida') {
      const remoteAddress = request.connection?.remoteAddress ||
                           request.socket?.remoteAddress;
      if (remoteAddress) {
        ip = remoteAddress.replace(/^::ffff:/, '');
      }
    }

    // 7. Detectar localhost y agregar contexto
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      // En desarrollo local, intentar obtener la IP pública de la red local
      const forwarded = request.headers['x-forwarded-for'];
      if (forwarded) {
        return `${ip} (proxy: ${forwarded})`;
      }
      return `${ip} (localhost)`;
    }

    return ip;
  }
}