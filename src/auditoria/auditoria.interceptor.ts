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

  constructor(
    private readonly reflector: Reflector,
    private readonly auditoriaService: AuditoriaService,
    private readonly alertasService: AlertasService,
  ) {}

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

    // Obtener información de la petición
    const metodoHttp = request.method;
    const endpoint = request.url;
    const ipAddress = request.ip || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // Datos del request
    const datosNuevos = this.extraerDatosRelevantes(request.body, request.query, request.params);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (responseData) => {
        const duration = Date.now() - startTime;

        try {
          // Extraer información de la entidad afectada
          const entidadInfo = this.extraerInfoEntidad(metadata, request, responseData);

          // Generar descripción legible
          const descripcion = this.generarDescripcion(
            metadata,
            user,
            entidadInfo,
            metodoHttp,
          );

          // 🔥 REGISTRAR AUDITORÍA - ESTO SE EJECUTA PARA TODOS LOS USUARIOS
          await this.auditoriaService.registrar({
            trabajadorId: user.id,
            trabajadorNombre: `${user.nombres} ${user.apellidos}`,
            trabajadorUsername: user.username,
            trabajadorRol: user.rol?.nombre || 'Sin rol',
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
      catchError((error) => {
        // Registrar también los errores
        const descripcion = this.generarDescripcion(
          metadata,
          user,
          { id: null, nombre: null },
          metodoHttp,
        );

        this.auditoriaService.registrar({
          trabajadorId: user.id,
          trabajadorNombre: `${user.nombres} ${user.apellidos}`,
          trabajadorUsername: user.username,
          trabajadorRol: user.rol?.nombre || 'Sin rol',
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

    if (request.params?.id) {
      id = parseInt(request.params.id);
    }

    if (!id && responseData?.id) {
      id = responseData.id;
    }

    if (metadata.entidadTipo === 'Paciente') {
      nombre = responseData?.nombre_completo ||
               (responseData?.nombres && responseData?.apellidos
                 ? `${responseData.nombres} ${responseData.apellidos}`
                 : null);
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
      EDITAR_HISTORIA_CLINICA: `Editó historia clínica del paciente ${entidadDescripcion}`,
      CREAR_REPORTE_EVOLUCION: `Creó un reporte de evolución para el paciente ${entidadDescripcion}`,
      EDITAR_REPORTE_EVOLUCION: `Editó un reporte de evolución para el paciente ${entidadDescripcion}`,
      ASIGNAR_SERVICIO: `Asignó servicio al paciente ${entidadDescripcion}`,
      CAMBIAR_ESTADO_PACIENTE: `Cambió estado del paciente ${entidadDescripcion}`,

      // CITAS
      VER_AGENDA: 'Consultó la agenda de citas',
      CREAR_CITA: `Creó una nueva cita ${entidadDescripcion}`,
      EDITAR_CITA: `Editó la cita ${entidadDescripcion}`,
      ELIMINAR_CITA: `Eliminó la cita ${entidadDescripcion}`,

      // ARCHIVOS
      SUBIR_ARCHIVO_DIGITAL: `Subió un archivo digital para el paciente ${entidadDescripcion}`,
      DESCARGAR_ARCHIVO: `Descargó un archivo ${entidadDescripcion}`,
      ELIMINAR_ARCHIVO: `Eliminó un archivo ${entidadDescripcion}`,
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
}