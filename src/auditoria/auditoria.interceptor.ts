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
import {
  detectarCambios,
  generarDescripcionDetallada,
  extraerNombreEntidad,
  requiereDescripcionDetallada,
} from './utils/auditoria-helpers';

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
    // Se incluye el cuerpo/params de la petición en la clave para que acciones
    // enviadas casi simultáneamente a la MISMA URL pero con datos distintos
    // (ej: bloquear varios días de la semana a la vez) se auditen por separado.
    // Los reenvíos reales idénticos (doble clic, reintentos) siguen deduplicándose.
    const cuerpoKey = this.serializarParaClave(request.body) + this.serializarParaClave(request.params);
    const requestKey = `${user.id}-${metadata.accion}-${metadata.modulo}-${request.url}-${request.method}-${cuerpoKey}`;
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

    // 📍 CAPTURAR COORDENADAS
    const coordenadas = this.extraerCoordenadas(request);

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

          // 🔥 REGISTRAR AUDITORÍA CON COORDENADAS
          this.logger.debug(`📝 Registrando auditoría: ${metadata.accion}`);

          await this.auditoriaService.registrar({
            trabajadorId: userCompleto.id,
            accion: metadata.accion,
            modulo: metadata.modulo,
            descripcion,
            datosNuevos,
            ipAddress,
            userAgent,
            ...coordenadas, // 📍 Coordenadas GPS
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
      catchError((error) => {
        // Guardar auditoría en background sin bloquear la propagación del error
        setImmediate(async () => {
          try {
            const userCompleto = await this.auditoriaService.completarDatosUsuario(user);
            const descripcion = this.generarDescripcion(metadata, userCompleto, request, null);
            await this.auditoriaService.registrar({
              trabajadorId: userCompleto.id,
              accion: metadata.accion,
              modulo: metadata.modulo,
              descripcion: `${descripcion} - ERROR: ${error.message}`,
              datosNuevos,
              ipAddress: this.obtenerIPReal(request),
              userAgent: request.headers['user-agent'],
              ...coordenadas,
            });
          } catch {}
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

    // 🔥 NUEVA FUNCIONALIDAD: Descripción detallada para EDITAR
    if (requiereDescripcionDetallada(metadata.modulo, metadata.accion)) {
      const descripcionDetallada = this.generarDescripcionConCambios(
        metadata,
        request,
        responseData,
      );
      if (descripcionDetallada) {
        return descripcionDetallada;
      }
      // Si no se pudo generar descripción detallada, continuar con la normal
    }

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
      ASIGNAR_SERVICIO: this.generarDescripcionAsignarServicio(responseData),
      DESASIGNAR_SERVICIO: this.generarDescripcionDesasignarServicio(responseData),
      CREAR_ASIGNACION_TERAPEUTA: this.generarDescripcionCrearAsignacionTerapeuta(responseData),
      EDITAR_TERAPEUTA: this.generarDescripcionEditarTerapeuta(responseData),
      DESASIGNAR_TERAPEUTA: this.generarDescripcionDesasignarTerapeuta(responseData),
      CAMBIAR_ESTADO_SERVICIO: this.generarDescripcionCambiarEstadoServicio(responseData),

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
      EDITAR_CITA: this.generarDescripcionEditarCita(responseData),
      ELIMINAR_CITA: this.generarDescripcionEliminarCita(responseData),

      // BLOQUEOS DE HORARIO
      CREAR_BLOQUEO: this.descBloqueoCrear(responseData),
      EDITAR_BLOQUEO: this.descBloqueoEditar(responseData),
      ELIMINAR_BLOQUEO: this.descBloqueoEliminar(request, responseData),

      // VENTAS
      REGISTRAR_VENTA_SERVICIO: this.descVentaRegistrar(responseData, 'servicios'),
      ACTUALIZAR_VENTA_SERVICIO: this.descVentaActualizar(responseData, 'servicios'),
      ELIMINAR_VENTA_SERVICIO: this.descVentaEliminar(responseData, 'servicios'),
      REGISTRAR_VENTA_PRODUCTO: this.descVentaRegistrar(responseData, 'productos'),
      ACTUALIZAR_VENTA_PRODUCTO: this.descVentaActualizar(responseData, 'productos'),
      ELIMINAR_VENTA_PRODUCTO: this.descVentaEliminar(responseData, 'productos'),
      REGISTRAR_SESION_USADA: this.descSesionUsada(responseData),
      VALIDAR_PAGO_VENTA: this.descValidarPago(responseData),

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

      // CENTRO OPERATIVO – TAREAS
      CREAR_TAREA: this.descTareaCrear(responseData),
      EDITAR_TAREA: this.descTareaEditar(responseData),
      ELIMINAR_TAREA: this.descTareaEliminar(request, responseData),
      MOVER_COLUMNA: this.descTareaMover(responseData),
      ARCHIVAR_TAREA: this.descTareaArchivar(responseData),
      RESTAURAR_TAREA: this.descTareaRestaurar(responseData),
      CREAR_COLUMNA: this.descColumnaCrear(responseData),
      ELIMINAR_COLUMNA: this.descColumnaEliminar(request, responseData),
      COMENTAR_TAREA: this.descTareaComentario(request, responseData),
      ELIMINAR_COMENTARIO: this.descEliminarComentario(request, responseData),

      // SISTEMA
      EXPORTAR_DATOS: `Exportó datos del módulo ${metadata.modulo}`,
      LOGIN: 'Inició sesión en el sistema',
      LOGOUT: 'Cerró sesión',
    };

    return accionesDescripciones[metadata.accion] ||
           `Realizó la acción ${metadata.accion} en ${metadata.modulo}`;
  }

  /**
   * 🔥 NUEVO: Genera descripción detallada con cambios detectados
   * Espera que responseData tenga la estructura:
   * { datosAnteriores: {...}, datosNuevos: {...}, ...otrosDatos }
   */
  private generarDescripcionConCambios(
    metadata: AuditableMetadata,
    request: any,
    responseData: any,
  ): string | null {
    try {
      // Verificar si responseData contiene datosAnteriores y datosNuevos
      let datosAnteriores = responseData?.datosAnteriores;
      let datosNuevos = responseData?.datosNuevos || responseData;

      // Si no hay datosAnteriores en responseData, intentar con el body del request
      if (!datosAnteriores) {
        // Para el caso de EDITAR, el body contiene los nuevos datos
        // pero no tenemos los anteriores aún
        this.logger.debug(
          `⚠️ No se encontraron datosAnteriores para generar descripción detallada en ${metadata.accion}`,
        );
        return null;
      }

      // Detectar cambios
      const cambios = detectarCambios(datosAnteriores, datosNuevos);

      if (cambios.length === 0) {
        return null; // No hay cambios, usar descripción normal
      }

      // Extraer ID de la entidad
      const idEntidad = request.params?.id || datosNuevos?.id || datosAnteriores?.id;

      // Extraer nombre de la entidad
      const nombreEntidad = extraerNombreEntidad(
        metadata.modulo,
        datosAnteriores,
        datosNuevos,
        idEntidad,
      );

      // Generar descripción detallada
      const descripcion = generarDescripcionDetallada(
        metadata.modulo,
        metadata.accion,
        nombreEntidad,
        cambios,
      );

      this.logger.debug(`✅ Descripción detallada generada con ${cambios.length} cambios`);
      return descripcion;
    } catch (error) {
      this.logger.error('❌ Error al generar descripción detallada:', error);
      return null;
    }
  }

  /**
   * Serializa body/params de forma acotada para usarlos en la clave anti-duplicados.
   * Evita que un objeto grande genere una clave enorme.
   */
  private serializarParaClave(obj: any): string {
    if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
      return '';
    }
    try {
      return JSON.stringify(obj).slice(0, 300);
    } catch {
      return '';
    }
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
   * 📍 Extraer coordenadas GPS desde los headers
   */
  private extraerCoordenadas(request: any): { latitud?: number; longitud?: number } {
    const latHeader = request.headers['x-user-latitude'];
    const lngHeader = request.headers['x-user-longitude'];

    if (!latHeader || !lngHeader) {
      return {}; // Sin coordenadas
    }

    const lat = parseFloat(latHeader);
    const lng = parseFloat(lngHeader);

    // Validar que sean números válidos
    if (isNaN(lat) || isNaN(lng)) {
      this.logger.warn('⚠️ Coordenadas inválidas en headers');
      return {};
    }

    this.logger.debug(`📍 Coordenadas capturadas: ${lat}, ${lng}`);

    return {
      latitud: lat,
      longitud: lng,
    };
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

  /**
   * 🔥 Genera descripción detallada para ASIGNAR_SERVICIO
   */
  private generarDescripcionAsignarServicio(responseData: any): string {
    if (!responseData) return 'Asignó servicio a un paciente';

    const pacienteNombre = responseData.paciente
      ? `${responseData.paciente.nombres} ${responseData.paciente.apellidos}`.trim()
      : 'un paciente';

    const servicioNombre = responseData.servicio?.nombre || 'un servicio';
    const terapeutaNombre = responseData.terapeuta
      ? `${responseData.terapeuta.nombres} ${responseData.terapeuta.apellidos}`.trim()
      : null;

    if (terapeutaNombre) {
      return `Asignó terapeuta ${terapeutaNombre} al servicio de ${servicioNombre} del paciente ${pacienteNombre}`;
    }

    return `Asignó servicio de ${servicioNombre} al paciente ${pacienteNombre}`;
  }

  /**
   * 🔥 Genera descripción detallada para DESASIGNAR_SERVICIO
   */
  private generarDescripcionDesasignarServicio(responseData: any): string {
    if (!responseData) return 'Desasignó servicio de un paciente';

    const pacienteNombre = responseData.paciente
      ? `${responseData.paciente.nombres} ${responseData.paciente.apellidos}`.trim()
      : 'un paciente';

    const servicioNombre = responseData.servicio?.nombre || 'un servicio';

    return `Eliminó el servicio de ${servicioNombre} del paciente ${pacienteNombre}`;
  }

  /**
   * 🔥 Genera descripción detallada para CREAR_ASIGNACION_TERAPEUTA
   */
  private generarDescripcionCrearAsignacionTerapeuta(responseData: any): string {
    if (!responseData) return 'Asignó terapeuta a un servicio';

    const pacienteNombre = responseData.paciente
      ? `${responseData.paciente.nombres} ${responseData.paciente.apellidos}`.trim()
      : 'un paciente';

    const servicioNombre = responseData.servicio?.nombre || 'un servicio';
    const terapeutaNombre = responseData.terapeuta
      ? `${responseData.terapeuta.nombres} ${responseData.terapeuta.apellidos}`.trim()
      : 'un terapeuta';

    return `Asignó terapeuta ${terapeutaNombre} al servicio de ${servicioNombre} del paciente ${pacienteNombre}`;
  }

  /**
   * 🔥 Genera descripción detallada para EDITAR_TERAPEUTA
   */
  private generarDescripcionEditarTerapeuta(responseData: any): string {
    if (!responseData) return 'Editó terapeuta de un servicio';

    const pacienteNombre = responseData.paciente
      ? `${responseData.paciente.nombres} ${responseData.paciente.apellidos}`.trim()
      : 'un paciente';

    const servicioNombre = responseData.servicio?.nombre || 'un servicio';

    const terapeutaAnterior = responseData.terapeutaAnterior
      ? `${responseData.terapeutaAnterior.nombres} ${responseData.terapeutaAnterior.apellidos}`.trim()
      : 'terapeuta anterior';

    const terapeutaNuevo = responseData.terapeutaNuevo
      ? `${responseData.terapeutaNuevo.nombres} ${responseData.terapeutaNuevo.apellidos}`.trim()
      : 'nuevo terapeuta';

    return `Cambió terapeuta del servicio ${servicioNombre}: ${terapeutaAnterior} → ${terapeutaNuevo} (paciente ${pacienteNombre})`;
  }

  /**
   * 🔥 Genera descripción detallada para DESASIGNAR_TERAPEUTA
   */
  private generarDescripcionDesasignarTerapeuta(responseData: any): string {
    if (!responseData) return 'Eliminó terapeuta de un servicio';

    const pacienteNombre = responseData.paciente
      ? `${responseData.paciente.nombres} ${responseData.paciente.apellidos}`.trim()
      : 'un paciente';

    const servicioNombre = responseData.servicio?.nombre || 'un servicio';
    const terapeutaNombre = responseData.terapeuta
      ? `${responseData.terapeuta.nombres} ${responseData.terapeuta.apellidos}`.trim()
      : 'un terapeuta';

    return `Eliminó al terapeuta ${terapeutaNombre} del servicio de ${servicioNombre} del paciente ${pacienteNombre}`;
  }

  /**
   * 🔥 Genera descripción detallada para EDITAR_CITA
   */
  private generarDescripcionEditarCita(responseData: any): string {
    if (!responseData) return 'Editó una cita';

    const pacienteNombre = responseData.paciente
      ? `${responseData.paciente.nombres} ${responseData.paciente.apellido_paterno || ''} ${responseData.paciente.apellido_materno || ''}`.trim()
      : 'un paciente';

    const motivo = responseData.motivo_accion || '';

    if (motivo) {
      return `Editó cita del paciente ${pacienteNombre}. Motivo: ${motivo}`;
    }

    return `Editó cita del paciente ${pacienteNombre}`;
  }

  /**
   * 🔥 Genera descripción detallada para CAMBIAR_ESTADO_SERVICIO
   */
  private generarDescripcionCambiarEstadoServicio(responseData: any): string {
    if (!responseData) return 'Cambió estado de servicio de un paciente';

    const pacienteNombre = responseData.paciente
      ? `${responseData.paciente.nombres} ${responseData.paciente.apellido_paterno || ''} ${responseData.paciente.apellido_materno || ''}`.trim()
      : 'un paciente';

    const servicioNombre = responseData.servicio?.nombre || 'un servicio';
    const estadoNuevo = responseData.estadoPaciente?.nombre || responseData.estadoPaciente?.id || '';

    if (estadoNuevo) {
      return `Cambió estado del servicio ${servicioNombre} a "${estadoNuevo}" para el paciente ${pacienteNombre}`;
    }

    return `Cambió estado del servicio ${servicioNombre} del paciente ${pacienteNombre}`;
  }

  /**
   * 🔥 Genera descripción detallada para ELIMINAR_CITA
   */
  private generarDescripcionEliminarCita(responseData: any): string {
    if (!responseData) return 'Eliminó una cita';

    const cita = responseData.cita || responseData;
    const pacienteNombre = cita.paciente
      ? `${cita.paciente.nombres} ${cita.paciente.apellido_paterno || ''} ${cita.paciente.apellido_materno || ''}`.trim()
      : 'un paciente';

    const motivo = responseData.motivo_accion || '';

    if (motivo) {
      return `Eliminó cita del paciente ${pacienteNombre}. Motivo: ${motivo}`;
    }

    return `Eliminó cita del paciente ${pacienteNombre}`;
  }

  // ─── Descripciones Bloqueos de Horario ──────────────────────────────────────

  /**
   * Nombre legible de la agenda (terapeuta) del bloqueo
   */
  private nombreAgendaBloqueo(b: any): string {
    const t = b?.trabajador;
    if (!t) return 'una agenda';
    const nombre = `${t.nombres ?? ''} ${t.apellidos ?? ''}`.trim();
    const especialidad = t.especialidad?.nombre;
    if (!nombre) return 'una agenda';
    return especialidad ? `${nombre} (${especialidad})` : nombre;
  }

  /**
   * Detalle legible del bloqueo: tipo, rango de fechas / día y horario
   */
  private formatBloqueoDetalle(b: any): string {
    if (!b) return '';
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const fmtFecha = (f: any) => {
      if (!f) return '';
      const [y, m, d] = String(f).slice(0, 10).split('-');
      return d && m && y ? `${d}/${m}/${y}` : String(f);
    };
    const fmtHora = (h: any) => (h ? String(h).slice(0, 5) : '');

    const codigo = b.tipoBloqueo?.codigo;
    const tipoNombre = b.tipoBloqueo?.nombre || codigo || 'Bloqueo';

    let periodo: string;
    if (codigo === 'RECURRENTE') {
      const dia = dias[b.diaSemana] ?? '';
      periodo = `${dia ? dia + 's, ' : ''}del ${fmtFecha(b.fechaInicio)} al ${fmtFecha(b.fechaFin)}`;
    } else {
      periodo = fmtFecha(b.fechaInicio);
    }

    const horario = b.todoElDia
      ? 'todo el día'
      : `${fmtHora(b.horaInicio)}–${fmtHora(b.horaFin)}`;

    return `${tipoNombre} (${periodo}, ${horario})`;
  }

  private descBloqueoCrear(r: any): string {
    if (!r) return 'Creó un bloqueo de horario';
    return `Creó un bloqueo en la agenda de ${this.nombreAgendaBloqueo(r)} — ${this.formatBloqueoDetalle(r)}. Motivo: ${r.motivo || 'sin especificar'}`;
  }

  private descBloqueoEditar(r: any): string {
    if (!r) return 'Editó un bloqueo de horario';
    return `Editó el bloqueo en la agenda de ${this.nombreAgendaBloqueo(r)} — ${this.formatBloqueoDetalle(r)}. Motivo: ${r.motivo || 'sin especificar'}`;
  }

  private descBloqueoEliminar(req: any, r: any): string {
    if (!r) {
      const id = req?.params?.id;
      return `Eliminó un bloqueo de horario${id ? ` #${id}` : ''}`;
    }
    const motivoElim = r.motivoEliminacion || req?.body?.motivoEliminacion;
    const base = `Eliminó el bloqueo de la agenda de ${this.nombreAgendaBloqueo(r)} — ${this.formatBloqueoDetalle(r)}. Motivo del bloqueo: ${r.motivo || 'sin especificar'}`;
    return motivoElim ? `${base}. Motivo de eliminación: ${motivoElim}` : base;
  }

  // ─── Descripciones Ventas ────────────────────────────────────────────────────

  /** Formatea un monto en soles */
  private montoVenta(n: any): string {
    return `S/ ${Number(n ?? 0).toFixed(2)}`;
  }

  /** Nombre del pagador de la venta (paciente / responsable / comprador externo) */
  private nombrePagadorVenta(v: any): string {
    const persona = (p: any) =>
      p ? `${p.nombres ?? ''} ${p.apellido_paterno ?? ''} ${p.apellido_materno ?? ''}`.replace(/\s+/g, ' ').trim() : '';
    const pac = persona(v?.paciente);
    if (pac) return pac;
    const resp = persona(v?.responsable);
    if (resp) return `${resp} (responsable)`;
    if (v?.comprador_externo?.nombre) return `${v.comprador_externo.nombre} (externo)`;
    return 'cliente no especificado';
  }

  /** Resumen corto de los ítems de la venta */
  private resumenItemsVenta(v: any, tipo: string): string {
    const detalles = v?.detalles || [];
    if (!detalles.length) return '';
    const map = (d: any) =>
      tipo === 'productos'
        ? `${d.cantidad ?? 1}x ${d.producto?.nombre ?? 'producto'}`
        : (d.descripcionLinea || d.descripcion_linea || d.servicio_tarifa?.servicio?.nombre || 'ítem');
    const items = detalles.slice(0, 3).map(map);
    const extra = detalles.length > 3 ? ` y ${detalles.length - 3} más` : '';
    return items.join('; ') + extra;
  }

  /** Encabezado común: comprobante + código */
  private encabezadoVenta(v: any): string {
    const comp = v?.tipo_comprobante?.nombre ? `${v.tipo_comprobante.nombre} ` : '';
    return `${comp}${v?.codigo_comprobante ?? ''}`.trim();
  }

  private descVentaRegistrar(r: any, tipo: string): string {
    if (!r) return `Registró una venta de ${tipo}`;
    const cab = this.encabezadoVenta(r);
    const nDet = (r.detalles || []).length;
    const items = this.resumenItemsVenta(r, tipo);
    return `Registró venta de ${tipo}${cab ? ` ${cab}` : ''} — Pagador: ${this.nombrePagadorVenta(r)} — Total: ${this.montoVenta(r.total)}${nDet ? ` — ${nDet} ítem(s): ${items}` : ''}`;
  }

  private descVentaEliminar(r: any, tipo: string): string {
    const res = r?.resumen || r;
    if (!res) return `Eliminó una venta de ${tipo}`;
    const cab = this.encabezadoVenta(res);
    const nDet = (res.detalles || []).length;
    const items = this.resumenItemsVenta(res, tipo);
    return `Eliminó venta de ${tipo}${cab ? ` ${cab}` : ''} — Pagador: ${this.nombrePagadorVenta(res)} — Total: ${this.montoVenta(res.total)}${nDet ? ` — ${nDet} ítem(s): ${items}` : ''}`;
  }

  /** Formatea un texto para el diff (truncado, con '(vacío)' si está en blanco) */
  private textoDiff(s: any): string {
    const t = (s ?? '').toString().trim();
    if (!t) return '(vacío)';
    return t.length > 60 ? `"${t.slice(0, 60)}…"` : `"${t}"`;
  }

  private descVentaActualizar(r: any, tipo: string): string {
    if (!r) return `Editó una venta de ${tipo}`;
    const cab = this.encabezadoVenta(r);
    const encabezado = `Editó venta de ${tipo}${cab ? ` ${cab}` : ''} — Pagador: ${this.nombrePagadorVenta(r)}`;

    const antes = r._auditoriaAntes;
    if (!antes) return `${encabezado} — Total actual: ${this.montoVenta(r.total)}`;

    const norm = (s: any) => (s ?? '').toString().trim();
    const cambios: string[] = [];

    if (Number(antes.total) !== Number(r.total)) {
      cambios.push(`total: ${this.montoVenta(antes.total)} → ${this.montoVenta(r.total)}`);
    }
    if (Number(antes.descuento_monto) !== Number(r.descuento_monto)) {
      cambios.push(`descuento: ${this.montoVenta(antes.descuento_monto)} → ${this.montoVenta(r.descuento_monto)}`);
    }

    // Comprobante y método de pago con nombres reales
    if ((antes.tipo_comprobante_id ?? null) !== (r.tipo_comprobante_id ?? null)) {
      cambios.push(`comprobante: ${antes.tipo_comprobante_nombre ?? 'ninguno'} → ${r.tipo_comprobante?.nombre ?? 'ninguno'}`);
    }
    if ((antes.modalidad_pago_id ?? null) !== (r.modalidad_pago_id ?? null)) {
      cambios.push(`método de pago: ${antes.modalidad_pago_nombre ?? 'ninguno'} → ${r.modalidad_pago?.nombre ?? 'ninguno'}`);
    }

    // Nota y observaciones con su contenido real
    if (norm(antes.nota) !== norm(r.nota)) {
      cambios.push(`nota: ${this.textoDiff(antes.nota)} → ${this.textoDiff(r.nota)}`);
    }
    if (norm(antes.observaciones) !== norm(r.observaciones)) {
      cambios.push(`observaciones: ${this.textoDiff(antes.observaciones)} → ${this.textoDiff(r.observaciones)}`);
    }

    // Diff de ítems línea por línea: agregado / quitado / modificado (cantidad, precio, subtotal)
    const cantLabel = tipo === 'productos' ? 'cantidad' : 'sesiones';
    const itemsAntes: any[] = antes.itemsDetalle || [];
    // Mismo mapeo que en el service para poder comparar antes vs. después
    const itemsDespues: any[] = (r.detalles || []).map((d: any) =>
      tipo === 'productos'
        ? {
            clave: `p${d.producto_id}`,
            nombre: d.producto?.nombre ?? 'producto',
            cantidad: Number(d.cantidad ?? 1),
            precio: Number(d.precio_unitario ?? 0),
            subtotal: Number(d.subtotal ?? 0),
          }
        : {
            clave: d.descripcionLinea || d.descripcion_linea || d.servicio_tarifa?.servicio?.nombre || `st${d.servicio_tarifa_id}` || 'item',
            nombre: d.descripcionLinea || d.descripcion_linea || d.servicio_tarifa?.servicio?.nombre || 'ítem',
            cantidad: Number(d.sesiones_totales ?? 1),
            precio: Number(d.precio_unitario ?? 0),
            subtotal: Number(d.subtotal ?? 0),
          });

    // Agrupar por clave (por si hay líneas repetidas del mismo ítem)
    const agrupar = (arr: any[]) => {
      const m = new Map<string, any>();
      for (const it of arr) {
        const g = m.get(it.clave) || { nombre: it.nombre, cantidad: 0, subtotal: 0, precio: it.precio };
        g.cantidad += it.cantidad;
        g.subtotal += it.subtotal;
        g.precio = it.precio;
        m.set(it.clave, g);
      }
      return m;
    };
    const mA = agrupar(itemsAntes);
    const mD = agrupar(itemsDespues);
    const dosDec = (n: any) => Number(n ?? 0).toFixed(2);

    for (const clave of new Set([...mA.keys(), ...mD.keys()])) {
      const a = mA.get(clave);
      const d = mD.get(clave);
      if (a && !d) {
        cambios.push(`quitó ítem: ${a.nombre} (${a.cantidad} ${cantLabel} × ${this.montoVenta(a.precio)} = ${this.montoVenta(a.subtotal)})`);
      } else if (!a && d) {
        cambios.push(`agregó ítem: ${d.nombre} (${d.cantidad} ${cantLabel} × ${this.montoVenta(d.precio)} = ${this.montoVenta(d.subtotal)})`);
      } else if (a && d) {
        const sub: string[] = [];
        if (a.cantidad !== d.cantidad) sub.push(`${cantLabel} ${a.cantidad} → ${d.cantidad}`);
        if (dosDec(a.precio) !== dosDec(d.precio)) sub.push(`precio ${this.montoVenta(a.precio)} → ${this.montoVenta(d.precio)}`);
        if (dosDec(a.subtotal) !== dosDec(d.subtotal)) sub.push(`subtotal ${this.montoVenta(a.subtotal)} → ${this.montoVenta(d.subtotal)}`);
        if (sub.length) cambios.push(`modificó ítem "${d.nombre}": ${sub.join(', ')}`);
      }
    }

    return cambios.length
      ? `${encabezado}. Cambios → ${cambios.join('; ')}`
      : `${encabezado} (sin cambios en montos ni contenido)`;
  }

  private descSesionUsada(r: any): string {
    if (r && r.sesiones_usadas !== undefined) {
      return `Descontó una sesión de un paquete de servicio (${r.sesiones_usadas}/${r.sesiones_totales} usadas)`;
    }
    return 'Descontó una sesión de un paquete de servicio';
  }

  private descValidarPago(r: any): string {
    const modalidad = r?.modalidad_pago?.nombre;
    const monto = r?.monto;
    const partes: string[] = [];
    if (monto !== undefined && monto !== null) partes.push(`Monto: ${this.montoVenta(monto)}`);
    if (modalidad) partes.push(`Método: ${modalidad}`);
    return `Validó un pago de venta${partes.length ? ` — ${partes.join(' — ')}` : ''}`;
  }

  // ─── Descripciones Centro Operativo (TAREAS) ────────────────────────────────

  private descTareaCrear(r: any): string {
    const titulo = r?.titulo || 'una tarea';
    const columna = r?.columna?.nombre;
    return columna
      ? `Creó la tarea "${titulo}" en la columna "${columna}"`
      : `Creó la tarea "${titulo}"`;
  }

  private descTareaEditar(r: any): string {
    const titulo = r?.titulo || 'una tarea';
    const antes = r?.datosAnteriores;
    if (!antes) return `Editó la tarea "${titulo}"`;

    const cambios: string[] = [];

    if (antes.titulo !== undefined && antes.titulo !== r.titulo) {
      cambios.push(`título: "${antes.titulo}" → "${r.titulo}"`);
    }

    const colAntes = antes.columna;
    const colDespues = r.columna?.nombre;
    if (colAntes !== undefined && colDespues && colAntes !== colDespues) {
      cambios.push(`columna: "${colAntes}" → "${colDespues}"`);
    }

    const prioAntes = antes.prioridad;
    const prioDespues = r.prioridad?.nombre;
    if (prioAntes !== undefined && prioDespues && prioAntes !== prioDespues) {
      cambios.push(`prioridad: "${prioAntes}" → "${prioDespues}"`);
    }

    if (antes.descripcion !== undefined && antes.descripcion !== r.descripcion) {
      const recortar = (s: string | null | undefined) => {
        if (!s) return '(vacío)';
        return s.length > 50 ? `"${s.slice(0, 50)}…"` : `"${s}"`;
      };
      cambios.push(`descripción: ${recortar(antes.descripcion)} → ${recortar(r.descripcion)}`);
    }

    if (antes.fecha_limite !== undefined) {
      const fmt = (f: any) => {
        if (!f) return 'sin fecha';
        const d = new Date(f);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      };
      const fl1 = antes.fecha_limite ? new Date(antes.fecha_limite).toISOString() : null;
      const fl2 = r.fecha_limite ? new Date(r.fecha_limite).toISOString() : null;
      if (fl1 !== fl2) cambios.push(`fecha límite: ${fmt(antes.fecha_limite)} → ${fmt(r.fecha_limite)}`);
    }

    return cambios.length
      ? `Editó la tarea "${titulo}": ${cambios.join(', ')}`
      : `Editó la tarea "${titulo}"`;
  }

  private descTareaEliminar(req: any, r: any): string {
    const titulo = r?.titulo;
    const id = req?.params?.id;
    return titulo
      ? `Eliminó la tarea "${titulo}"`
      : `Eliminó la tarea #${id ?? 'desconocida'}`;
  }

  private descTareaMover(r: any): string {
    const titulo = r?.titulo || 'una tarea';
    const columna = r?.columna?.nombre;
    return columna
      ? `Movió la tarea "${titulo}" a la columna "${columna}"`
      : `Movió la tarea "${titulo}" de columna`;
  }

  private descTareaArchivar(r: any): string {
    const titulo = r?.titulo || 'una tarea';
    return `Archivó la tarea "${titulo}"`;
  }

  private descTareaRestaurar(r: any): string {
    const titulo = r?.titulo || 'una tarea';
    return `Restauró la tarea "${titulo}"`;
  }

  private descColumnaCrear(r: any): string {
    const nombre = r?.nombre || 'una columna';
    return `Creó la columna "${nombre}"`;
  }

  private descColumnaEliminar(req: any, r: any): string {
    const nombre = r?.nombre;
    const id = req?.params?.id;
    return nombre
      ? `Eliminó la columna "${nombre}"`
      : `Eliminó la columna #${id ?? 'desconocida'}`;
  }

  private descTareaComentario(req: any, r: any): string {
    const tareaId = req?.params?.id;
    const tarea = r?.tarea;
    const tituloTarea = tarea?.titulo;
    const contenido: string = r?.contenido || '';
    const resumen = contenido.length > 60 ? contenido.slice(0, 60) + '…' : contenido;

    if (tituloTarea) {
      return resumen
        ? `Comentó en la tarea "${tituloTarea}": "${resumen}"`
        : `Comentó en la tarea "${tituloTarea}"`;
    }
    return resumen
      ? `Comentó en la tarea #${tareaId}: "${resumen}"`
      : `Comentó en la tarea #${tareaId}`;
  }

  private descEliminarComentario(req: any, r: any): string {
    const tarea = r?.tarea;
    const tituloTarea = tarea?.titulo;
    const id = req?.params?.comentarioId;
    return tituloTarea
      ? `Eliminó un comentario de la tarea "${tituloTarea}"`
      : `Eliminó el comentario #${id ?? 'desconocido'}`;
  }
}