import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventoSistema } from './entities/evento-sistema.entity';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionDestino } from './entities/notificacion-destino.entity';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';
import { NotificacionLeida } from './entities/notificacion-leida.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

const ROL_ADMIN     = 1;
const ROL_ADMISION  = 2;
const ROL_TERAPEUTA = 4;
const TODOS_LOS_ROLES = [ROL_ADMIN, ROL_ADMISION, ROL_TERAPEUTA];

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectRepository(EventoSistema)
    private eventosRepo: Repository<EventoSistema>,
    @InjectRepository(Notificacion)
    private notificacionesRepo: Repository<Notificacion>,
    @InjectRepository(NotificacionDestino)
    private destinosRepo: Repository<NotificacionDestino>,
    @InjectRepository(NotificacionLeida)
    private leidasRepo: Repository<NotificacionLeida>,
    @InjectRepository(TrabajadorCentro)
    private trabajadoresRepo: Repository<TrabajadorCentro>,
  ) {}

  async crearEvento(dto: CrearEventoDto): Promise<EventoSistema> {
    try {
      const evento = this.eventosRepo.create({
        ...dto,
        datos_adicionales: dto.datos_adicionales ? JSON.stringify(dto.datos_adicionales) : null,
      });
      const eventoGuardado = await this.eventosRepo.save(evento);
      this.logger.log(`Evento creado: ${dto.tipo_evento} - ID: ${eventoGuardado.id}`);
      return eventoGuardado;
    } catch (error) {
      this.logger.error(`Error al crear evento: ${error.message}`);
      throw error;
    }
  }

  async crearNotificacion(dto: CrearNotificacionDto): Promise<Notificacion> {
    try {
      const notificacion = this.notificacionesRepo.create({
        tipo_notificacion: dto.tipo_notificacion,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        evento_id: dto.evento_id,
      });
      const notificacionGuardada = await this.notificacionesRepo.save(notificacion);

      const destinos = dto.roles_destino.map(rol_id =>
        this.destinosRepo.create({ notificacion_id: notificacionGuardada.id, rol_id }),
      );
      await this.destinosRepo.save(destinos);

      this.logger.log(
        `Notificación creada: ${dto.titulo} - ID: ${notificacionGuardada.id} - Roles: [${dto.roles_destino.join(', ')}]`,
      );
      return notificacionGuardada;
    } catch (error) {
      this.logger.error(`Error al crear notificación: ${error.message}`);
      throw error;
    }
  }

  async obtenerNotificacionesPorRol(rolId: number, usuarioId: number, limite: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT
          n.id, n.tipo_notificacion, n.titulo, n.mensaje, n.fecha_creacion,
          e.tipo_evento, e.descripcion as evento_descripcion, e.datos_adicionales, e.fecha_evento,
          CASE WHEN nl.id IS NOT NULL THEN 1 ELSE 0 END as leida
        FROM notificaciones n
        INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
        INNER JOIN eventos_sistema e ON e.id = n.evento_id
        LEFT JOIN notificaciones_leidas nl ON nl.notificacion_id = n.id AND nl.usuario_id = ?
        WHERE nd.rol_id = ?
          AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          ${this.filtrosSql()}
        ORDER BY n.fecha_creacion DESC
        LIMIT ?
      `;
      const rows = await this.notificacionesRepo.query(query, [usuarioId, rolId, ...this.filtrosParams(usuarioId, rolId), limite]);
      return rows.map(n => ({ ...n, datos_adicionales: n.datos_adicionales ? JSON.parse(n.datos_adicionales) : null, leida: n.leida === 1 }));
    } catch (error) {
      this.logger.error(`Error al obtener notificaciones: ${error.message}`);
      throw error;
    }
  }

  async obtenerNotificacionesRecientes(
    rolId: number,
    usuarioId: number,
    limite: number = 15,
    offset: number = 0,
    fecha: string | null = null,
    tipo: string | null = null,
    leida?: string,
  ): Promise<any[]> {
    try {
      const condFecha = fecha
        ? `AND DATE(CONVERT_TZ(n.fecha_creacion, '+00:00', '-05:00')) = '${fecha}'`
        : `AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
      const condTipo = tipo ? `AND n.tipo_notificacion = '${tipo}'` : '';
      const condLeida = leida === 'true' ? 'AND nl.id IS NOT NULL' : leida === 'false' ? 'AND nl.id IS NULL' : '';

      const query = `
        SELECT
          n.id, n.tipo_notificacion, n.titulo, n.mensaje, n.fecha_creacion,
          e.tipo_evento, e.datos_adicionales,
          TIMESTAMPDIFF(MINUTE, n.fecha_creacion, NOW()) as minutos_transcurridos,
          nl.id as notif_leida_id,
          CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END as leida
        FROM notificaciones n
        INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
        INNER JOIN eventos_sistema e ON e.id = n.evento_id
        LEFT JOIN notificaciones_leidas nl ON nl.notificacion_id = n.id AND nl.usuario_id = ?
        WHERE nd.rol_id = ?
          ${condFecha}
          ${condTipo}
          ${condLeida}
          ${this.filtrosSql()}
        ORDER BY n.fecha_creacion DESC
        LIMIT ? OFFSET ?
      `;
      const rows = await this.notificacionesRepo.query(query, [usuarioId, rolId, ...this.filtrosParams(usuarioId, rolId), limite, offset]);

      return rows.map(notif => {
        const leidaBoolean = !!notif.notif_leida_id || notif.leida === 1 || notif.leida === true || notif.leida === '1';
        const datosAdicionales = notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null;
        let terapeutaNombre: string | null = null;
        if (datosAdicionales) {
          if (notif.tipo_notificacion === 'CITA_MODIFICADA') {
            terapeutaNombre = datosAdicionales.terapeuta_nombre || datosAdicionales.terapeuta_nuevo || datosAdicionales.terapeuta_anterior || null;
          } else if (notif.tipo_notificacion === 'CITA_ELIMINADA' || notif.tipo_notificacion === 'NOTA_EVOLUCION') {
            terapeutaNombre = datosAdicionales.terapeuta_nombre || null;
          }
        }
        return { ...notif, datos_adicionales: datosAdicionales, leida: leidaBoolean, terapeuta_nombre: terapeutaNombre };
      });
    } catch (error) {
      this.logger.error(`Error al obtener notificaciones recientes: ${error.message}`);
      throw error;
    }
  }

  async contarNotificacionesPorRol(rolId: number, usuarioId: number): Promise<number> {
    try {
      const query = `
        SELECT COUNT(DISTINCT n.id) as total
        FROM notificaciones n
        INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
        INNER JOIN eventos_sistema e ON e.id = n.evento_id
        LEFT JOIN notificaciones_leidas nl ON nl.notificacion_id = n.id AND nl.usuario_id = ?
        WHERE nd.rol_id = ?
          AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND nl.id IS NULL
          ${this.filtrosSql()}
      `;
      const result = await this.notificacionesRepo.query(query, [usuarioId, rolId, ...this.filtrosParams(usuarioId, rolId)]);
      return parseInt(result[0]?.total ?? '0');
    } catch (error) {
      this.logger.error(`Error al contar notificaciones: ${error.message}`);
      throw error;
    }
  }

  async marcarComoLeida(
    notificacionId: number,
    usuarioId: number,
  ): Promise<{ success: boolean; nuevoConteo?: number }> {
    try {
      const notificacionExiste = await this.notificacionesRepo.findOne({
        where: { id: notificacionId },
      });
      if (!notificacionExiste) {
        throw new Error(`Notificación ${notificacionId} no encontrada`);
      }

      const yaLeida = await this.leidasRepo.findOne({
        where: { notificacion_id: notificacionId, usuario_id: usuarioId },
      });
      if (yaLeida) {
        const rolId = await this.obtenerRolDelUsuario(usuarioId);
        const nuevoConteo = await this.contarNotificacionesPorRol(rolId, usuarioId);
        return { success: true, nuevoConteo };
      }

      const nuevaLeida = this.leidasRepo.create({
        notificacion_id: notificacionId,
        usuario_id: usuarioId,
        fecha_lectura: new Date(),
      });
      await this.leidasRepo.save(nuevaLeida);

      const rolId = await this.obtenerRolDelUsuario(usuarioId);
      const nuevoConteo = await this.contarNotificacionesPorRol(rolId, usuarioId);
      return { success: true, nuevoConteo };
    } catch (error) {
      this.logger.error(`Error en marcarComoLeida: ${error.message}`);
      throw error;
    }
  }

  private async obtenerRolDelUsuario(usuarioId: number): Promise<number> {
    const query = `SELECT rol_id FROM trabajador_centro WHERE id = ? LIMIT 1`;
    const resultado = await this.notificacionesRepo.query(query, [usuarioId]);
    return resultado[0]?.rol_id || ROL_ADMIN;
  }

  async marcarTodasComoLeidas(rolId: number, usuarioId: number): Promise<void> {
    try {
      const query = `
        SELECT DISTINCT n.id
        FROM notificaciones n
        INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
        LEFT JOIN notificaciones_leidas nl ON nl.notificacion_id = n.id AND nl.usuario_id = ?
        WHERE nd.rol_id = ?
          AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND nl.id IS NULL
      `;
      const notificaciones = await this.notificacionesRepo.query(query, [usuarioId, rolId]);

      if (notificaciones.length === 0) return;

      for (const notif of notificaciones) {
        try {
          await this.marcarComoLeida(notif.id, usuarioId);
        } catch (error) {
          this.logger.error(`Error al marcar notificación ${notif.id}: ${error.message}`);
        }
      }

      this.logger.log(`${notificaciones.length} notificaciones marcadas como leídas por usuario ${usuarioId}`);
    } catch (error) {
      this.logger.error(`Error al marcar todas como leídas: ${error.message}`);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS ESPECÍFICOS POR TIPO DE NOTIFICACIÓN
  // ========================================

  async notificarAniversarioLaboral(
    empleadoId: number,
    nombreEmpleado: string,
    fechaIngreso: string,
    anosServicio: number,
    cargo: string,
    usuarioCreador: number,
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'ANIVERSARIO_LABORAL',
      descripcion: `${nombreEmpleado} cumple ${anosServicio} años de servicio`,
      usuario_id: usuarioCreador,
      datos_adicionales: { empleado_id: empleadoId, nombre_empleado: nombreEmpleado, fecha_ingreso: fechaIngreso, anos_servicio: anosServicio, cargo },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'ANIVERSARIO',
      titulo: 'Aniversario Laboral',
      mensaje: `${nombreEmpleado} cumplirá ${anosServicio} años en la empresa el ${fechaIngreso}. Cargo: ${cargo}.`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
  }

  async notificarCumpleanospPaciente(
    pacienteId: number,
    nombrePaciente: string,
    fechaNacimiento: string,
    edad: number,
    usuarioCreador: number,
    rolesDestino: number[],
  ) {
    const yaExiste = await this.verificarEventoExistente('CUMPLEANOS_PACIENTE', pacienteId, rolesDestino);
    if (yaExiste) {
      this.logger.warn(`Ya existe notificación de cumpleaños para paciente ${pacienteId} (${nombrePaciente})`);
      return null;
    }
    const evento = await this.crearEvento({
      tipo_evento: 'CUMPLEANOS_PACIENTE',
      descripcion: `${nombrePaciente} cumplirá ${edad} años`,
      usuario_id: usuarioCreador,
      datos_adicionales: { paciente_id: pacienteId, nombre_paciente: nombrePaciente, fecha_nacimiento: fechaNacimiento, edad },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'CUMPLEANOS',
      titulo: 'Cumpleaños de Paciente',
      mensaje: `${nombrePaciente} cumplirá ${edad} años el ${fechaNacimiento}.`,
      evento_id: evento.id,
      roles_destino: rolesDestino,
    });
    this.logger.log(`Notificación de cumpleaños creada para paciente ${nombrePaciente}`);
  }

  async notificarCumpleanosEmpleado(
    empleadoId: number,
    nombreEmpleado: string,
    fechaNacimiento: string,
    edad: number,
    cargo: string,
    usuarioCreador: number,
  ) {
    const yaExiste = await this.verificarEventoExistente('CUMPLEANOS_EMPLEADO', empleadoId, [ROL_ADMIN]);
    if (yaExiste) {
      this.logger.warn(`Ya existe notificación de cumpleaños para empleado ${empleadoId} (${nombreEmpleado})`);
      return null;
    }
    const evento = await this.crearEvento({
      tipo_evento: 'CUMPLEANOS_EMPLEADO',
      descripcion: `${nombreEmpleado} cumplirá ${edad} años`,
      usuario_id: usuarioCreador,
      datos_adicionales: { empleado_id: empleadoId, nombre_empleado: nombreEmpleado, fecha_nacimiento: fechaNacimiento, edad, cargo },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'CUMPLEANOS',
      titulo: 'Cumpleaños de Empleado',
      mensaje: `${nombreEmpleado} cumplirá ${edad} años el ${fechaNacimiento}. Cargo: ${cargo}.`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
    this.logger.log(`Notificación de cumpleaños creada para empleado ${nombreEmpleado}`);
  }

  async notificarAccesoFueraHorario(
    empleadoId: number,
    nombreEmpleado: string,
    horaIngreso: string,
    ip: string,
    dispositivo: string,
    usuarioCreador: number,
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'ACCESO_FUERA_HORARIO',
      descripcion: `${nombreEmpleado} accedió fuera del horario laboral`,
      usuario_id: usuarioCreador,
      ip,
      dispositivo,
      datos_adicionales: { empleado_id: empleadoId, nombre_empleado: nombreEmpleado, hora_ingreso: horaIngreso },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'ACCESO',
      titulo: 'Acceso Fuera de Horario',
      mensaje: `${nombreEmpleado} accedió al sistema el ${new Date().toLocaleDateString('es-ES')} a las ${horaIngreso}. IP: ${ip}`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
  }

  async notificarCitaEliminada(
    citaId: number,
    usuarioEliminadorId: number,
    nombreUsuarioEliminador: string,
    pacienteNombre: string,
    fechaCita: string,
    horaCita: string,
    terapeutaNombre: string,
    motivoEliminacion: string,
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'CITA_ELIMINADA',
      descripcion: `Cita eliminada por ${nombreUsuarioEliminador}`,
      usuario_id: usuarioEliminadorId,
      datos_adicionales: { cita_id: citaId, paciente_nombre: pacienteNombre, fecha_cita: fechaCita, hora_cita: horaCita, terapeuta_nombre: terapeutaNombre, motivo_eliminacion: motivoEliminacion },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'CITA_ELIMINADA',
      titulo: 'Cita Eliminada',
      mensaje: `${nombreUsuarioEliminador} eliminó una cita de ${pacienteNombre} programada para el ${fechaCita} a las ${horaCita} con ${terapeutaNombre}. Motivo: ${motivoEliminacion}`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
  }

  async notificarCitaModificada(
    citaId: number,
    usuarioModificadorId: number,
    nombreUsuarioModificador: string,
    pacienteNombre: string,
    fechaAnterior: string,
    horaAnterior: string,
    terapeutaNombre: string,
    terapeutaId: number,
    fechaNueva: string,
    horaNueva: string,
    motivoModificacion: string,
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'CITA_MODIFICADA',
      descripcion: `Cita modificada por ${nombreUsuarioModificador}`,
      usuario_id: usuarioModificadorId,
      datos_adicionales: { cita_id: citaId, paciente_nombre: pacienteNombre, fecha_anterior: fechaAnterior, hora_anterior: horaAnterior, terapeuta_nombre: terapeutaNombre, terapeuta_id: terapeutaId, fecha_nueva: fechaNueva, hora_nueva: horaNueva, motivo_modificacion: motivoModificacion },
    });

    const cambios: string[] = [];
    if (fechaAnterior !== fechaNueva || horaAnterior !== horaNueva) {
      cambios.push(`reprogramó de ${fechaAnterior} ${horaAnterior} a ${fechaNueva} ${horaNueva}`);
    }
    const mensajeCambios = cambios.length > 0 ? cambios.join(', ') : 'modificó la cita';

    await this.crearNotificacion({
      tipo_notificacion: 'CITA_MODIFICADA',
      titulo: 'Cita Modificada',
      mensaje: `${nombreUsuarioModificador} ${mensajeCambios} de ${pacienteNombre} con ${terapeutaNombre}. Motivo: ${motivoModificacion}`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
  }

  async notificarNotaEvolucion(
    terapeutaId: number,
    terapeutaNombre: string,
    pacienteNombre: string,
    tipoSesion: string,
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'NOTA_EVOLUCION',
      descripcion: `${terapeutaNombre} registró una nota de evolución`,
      usuario_id: terapeutaId,
      datos_adicionales: { terapeuta_id: terapeutaId, terapeuta_nombre: terapeutaNombre, paciente_nombre: pacienteNombre, tipo_sesion: tipoSesion },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'NOTA_EVOLUCION',
      titulo: 'Nota de Evolución Registrada',
      mensaje: `${terapeutaNombre} registró una nota de evolución para ${pacienteNombre}. Tipo: ${tipoSesion}.`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
  }

  async notificarInconsistenciaAsistencia(
    citaId: number,
    pacienteNombre: string,
    terapeutaNombre: string,
    fechaCita: string,
    horaCita: string,
    estadoRecepcion: number,
    estadoTerapeuta: number,
    recepcionMarco: boolean,
    terapeutaMarco: boolean,
  ) {
    let tipoInconsistencia = '';
    let mensajeDetallado = '';

    if (!recepcionMarco && !terapeutaMarco) {
      tipoInconsistencia = 'Ninguno marcó asistencia';
      mensajeDetallado = `Cita #${citaId} - Ninguno marcó asistencia`;
    } else if (!recepcionMarco) {
      tipoInconsistencia = 'Falta registro de admisión';
      mensajeDetallado = `Cita #${citaId} - Falta registro de admisión`;
    } else if (!terapeutaMarco) {
      tipoInconsistencia = 'Falta registro del terapeuta';
      mensajeDetallado = `Cita #${citaId} - Falta registro del terapeuta`;
    } else if (estadoRecepcion !== estadoTerapeuta) {
      const estadoAdmisionTexto = estadoRecepcion === 7 ? 'Asistió' : 'Sesión Dictada';
      const estadoTerapeutaTexto = estadoTerapeuta === 7 ? 'Asistió' : 'Sesión Dictada';
      tipoInconsistencia = 'Estados no coinciden';
      mensajeDetallado = `Cita #${citaId} - Estados no coinciden (Admisión: ${estadoAdmisionTexto}, Terapeuta: ${estadoTerapeutaTexto})`;
    }

    const evento = await this.crearEvento({
      tipo_evento: 'INCONSISTENCIA_ASISTENCIA',
      descripcion: `Inconsistencia detectada en cita #${citaId}`,
      usuario_id: ROL_ADMIN,
      datos_adicionales: { cita_id: citaId, paciente_nombre: pacienteNombre, terapeuta_nombre: terapeutaNombre, fecha_cita: fechaCita, hora_cita: horaCita, estado_recepcion: estadoRecepcion, estado_terapeuta: estadoTerapeuta, recepcion_marco: recepcionMarco, terapeuta_marco: terapeutaMarco, tipo_inconsistencia: tipoInconsistencia },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'INCONSISTENCIA_ASISTENCIA',
      titulo: 'Inconsistencia de Asistencia',
      mensaje: mensajeDetallado,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
    this.logger.log(`Notificación de inconsistencia creada para cita #${citaId}: ${tipoInconsistencia}`);
  }

  async notificarIndicacionTerapeutica(
    indicacionId: number,
    terapeutaId: number,
    terapeutaNombre: string,
    pacienteId: number,
    pacienteNombre: string,
    servicioNombre: string,
    fecha: string,
  ) {
    const ahora = new Date();
    const fechaRegistro = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });
    const horaRegistro = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Lima' });

    const evento = await this.crearEvento({
      tipo_evento: 'INDICACION_TERAPEUTICA',
      descripcion: `${terapeutaNombre} registró una indicación terapéutica el ${fechaRegistro} a las ${horaRegistro}`,
      usuario_id: terapeutaId,
      datos_adicionales: { indicacion_id: indicacionId, terapeuta_id: terapeutaId, terapeuta_nombre: terapeutaNombre, paciente_id: pacienteId, paciente_nombre: pacienteNombre, servicio_nombre: servicioNombre, fecha_indicacion: fecha, fecha_registro: fechaRegistro, hora_registro: horaRegistro },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'INDICACION_TERAPEUTICA',
      titulo: 'Nueva Indicación Terapéutica',
      mensaje: `${terapeutaNombre} registró una indicación terapéutica para ${pacienteNombre} (${servicioNombre}). Fecha de indicación: ${fecha}.`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN, ROL_ADMISION],
    });
    this.logger.log(`Notificación de indicación terapéutica creada para paciente ${pacienteNombre}`);
  }

  // ────────────────────────────────────────────────────────────────
  // DOCUMENTOS
  // ────────────────────────────────────────────────────────────────

  /**
   * Admisión (rol 2) sube un archivo → notifica a los terapeutas asignados al paciente (rol 4).
   * Guarda terapeutas_destinatarios para filtrar en las consultas de cada terapeuta.
   */
  async notificarDocumentoSubido(
    archivoId: number,
    usuarioAdmisionId: number,
    usuarioAdmisionNombre: string,
    pacienteId: number,
    pacienteNombre: string,
    tipoDocumento: string,
    terapeutasIds: number[],
  ) {
    const ahora = new Date();
    const fechaSubida = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });
    const horaSubida = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Lima' });

    const evento = await this.crearEvento({
      tipo_evento: 'DOCUMENTO_SUBIDO',
      descripcion: `${usuarioAdmisionNombre} subió un documento para ${pacienteNombre}`,
      usuario_id: usuarioAdmisionId,
      datos_adicionales: {
        archivo_id: archivoId,
        usuario_admision_id: usuarioAdmisionId,
        usuario_admision_nombre: usuarioAdmisionNombre,
        paciente_id: pacienteId,
        paciente_nombre: pacienteNombre,
        tipo_documento: tipoDocumento,
        fecha_subida: fechaSubida,
        hora_subida: horaSubida,
        terapeutas_destinatarios: terapeutasIds,
      },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'DOCUMENTO_SUBIDO',
      titulo: 'Nuevo Documento Subido',
      mensaje: `${usuarioAdmisionNombre} subió un documento (${tipoDocumento}) para ${pacienteNombre}.`,
      evento_id: evento.id,
      roles_destino: [ROL_TERAPEUTA],
    });
    this.logger.log(`Notificación de documento enviada a ${terapeutasIds.length} terapeuta(s) - Paciente: ${pacienteNombre}`);
  }

  /**
   * Admisión (rol 2) sube un archivo → notifica también al Administrador (rol 1).
   * Se llama en paralelo con notificarDocumentoSubido().
   */
  async notificarDocumentoSubidoPorAdminOAdmision(
    archivoId: number,
    usuarioAdmisionId: number,
    usuarioAdmisionNombre: string,
    pacienteId: number,
    pacienteNombre: string,
    tipoDocumento: string,
  ) {
    const ahora = new Date();
    const fechaSubida = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });
    const horaSubida = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Lima' });

    const evento = await this.crearEvento({
      tipo_evento: 'DOCUMENTO_SUBIDO',
      descripcion: `${usuarioAdmisionNombre} subió un documento para ${pacienteNombre}`,
      usuario_id: usuarioAdmisionId,
      datos_adicionales: {
        archivo_id: archivoId,
        usuario_admision_id: usuarioAdmisionId,
        usuario_admision_nombre: usuarioAdmisionNombre,
        paciente_id: pacienteId,
        paciente_nombre: pacienteNombre,
        tipo_documento: tipoDocumento,
        fecha_subida: fechaSubida,
        hora_subida: horaSubida,
        // Sin terapeutas_destinatarios → el admin no necesita filtro adicional
      },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'DOCUMENTO_SUBIDO',
      titulo: 'Nuevo Documento Subido',
      mensaje: `${usuarioAdmisionNombre} subió un documento (${tipoDocumento}) para ${pacienteNombre}.`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
    this.logger.log(`Notificación de documento enviada al Administrador - Paciente: ${pacienteNombre}`);
  }

  /**
   * Terapeuta (rol 4) sube un archivo → notifica solo al Administrador (rol 1).
   */
  async notificarDocumentoSubidoPorTerapeuta(
    archivoId: number,
    terapeutaId: number,
    terapeutaNombre: string,
    pacienteId: number,
    pacienteNombre: string,
    tipoDocumento: string,
  ) {
    const ahora = new Date();
    const fechaSubida = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });
    const horaSubida = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Lima' });

    const evento = await this.crearEvento({
      tipo_evento: 'DOCUMENTO_SUBIDO',
      descripcion: `${terapeutaNombre} subió un documento para ${pacienteNombre}`,
      usuario_id: terapeutaId,
      datos_adicionales: {
        archivo_id: archivoId,
        terapeuta_id: terapeutaId,
        terapeuta_nombre: terapeutaNombre,
        paciente_id: pacienteId,
        paciente_nombre: pacienteNombre,
        tipo_documento: tipoDocumento,
        fecha_subida: fechaSubida,
        hora_subida: horaSubida,
      },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'DOCUMENTO_SUBIDO',
      titulo: 'Nuevo Documento Subido',
      mensaje: `${terapeutaNombre} subió un documento (${tipoDocumento}) para ${pacienteNombre}.`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN],
    });
    this.logger.log(`Notificación de documento enviada al Administrador por terapeuta - Paciente: ${pacienteNombre}`);
  }

  // ────────────────────────────────────────────────────────────────
  // PREVENCIÓN Y LIMPIEZA DE DUPLICADOS
  // ────────────────────────────────────────────────────────────────

  private async verificarEventoExistente(
    tipoEvento: string,
    entidadId: number,
    roles: number[],
  ): Promise<boolean> {
    try {
      let query: string;
      let params: any[];

      if (tipoEvento === 'CUMPLEANOS_PACIENTE') {
        query = `
          SELECT COUNT(DISTINCT e.id) as total
          FROM eventos_sistema e
          INNER JOIN notificaciones n ON n.evento_id = e.id
          WHERE e.tipo_evento = ?
            AND JSON_EXTRACT(e.datos_adicionales, '$.paciente_id') = ?
            AND DATE(e.fecha_evento) = CURDATE()
        `;
        params = [tipoEvento, entidadId];
      } else if (tipoEvento === 'CUMPLEANOS_EMPLEADO' || tipoEvento === 'ANIVERSARIO_LABORAL') {
        query = `
          SELECT COUNT(DISTINCT e.id) as total
          FROM eventos_sistema e
          INNER JOIN notificaciones n ON n.evento_id = e.id
          WHERE e.tipo_evento = ?
            AND JSON_EXTRACT(e.datos_adicionales, '$.empleado_id') = ?
            AND DATE(e.fecha_evento) = CURDATE()
        `;
        params = [tipoEvento, entidadId];
      } else {
        return false;
      }

      const result = await this.eventosRepo.query(query, params);
      return parseInt(result[0].total) > 0;
    } catch (error) {
      this.logger.error(`Error al verificar evento existente: ${error.message}`);
      return true;
    }
  }

  async limpiarNotificacionesDuplicadas(): Promise<{
    eliminados_pacientes: number;
    eliminados_empleados: number;
    eliminados_aniversarios: number;
    total_eliminados: number;
  }> {
    try {
      this.logger.log('Iniciando limpieza de notificaciones duplicadas...');

      const deletePacientes = `
        DELETE n FROM notificaciones n
        INNER JOIN eventos_sistema e ON e.id = n.evento_id
        WHERE e.tipo_evento = 'CUMPLEANOS_PACIENTE'
        AND n.id NOT IN (
          SELECT * FROM (
            SELECT MAX(n2.id) FROM notificaciones n2
            INNER JOIN eventos_sistema e2 ON e2.id = n2.evento_id
            WHERE e2.tipo_evento = 'CUMPLEANOS_PACIENTE'
            GROUP BY JSON_EXTRACT(e2.datos_adicionales, '$.paciente_id'), YEAR(e2.fecha_evento)
          ) AS keep_ids
        )
      `;
      const resultPacientes = await this.notificacionesRepo.query(deletePacientes);
      const eliminadosPacientes = resultPacientes.affectedRows || 0;
      await this.eventosRepo.query(`DELETE FROM eventos_sistema WHERE tipo_evento = 'CUMPLEANOS_PACIENTE' AND id NOT IN (SELECT DISTINCT evento_id FROM notificaciones)`);

      const deleteEmpleados = `
        DELETE n FROM notificaciones n
        INNER JOIN eventos_sistema e ON e.id = n.evento_id
        WHERE e.tipo_evento = 'CUMPLEANOS_EMPLEADO'
        AND n.id NOT IN (
          SELECT * FROM (
            SELECT MAX(n2.id) FROM notificaciones n2
            INNER JOIN eventos_sistema e2 ON e2.id = n2.evento_id
            WHERE e2.tipo_evento = 'CUMPLEANOS_EMPLEADO'
            GROUP BY JSON_EXTRACT(e2.datos_adicionales, '$.empleado_id'), YEAR(e2.fecha_evento)
          ) AS keep_ids
        )
      `;
      const resultEmpleados = await this.notificacionesRepo.query(deleteEmpleados);
      const eliminadosEmpleados = resultEmpleados.affectedRows || 0;
      await this.eventosRepo.query(`DELETE FROM eventos_sistema WHERE tipo_evento = 'CUMPLEANOS_EMPLEADO' AND id NOT IN (SELECT DISTINCT evento_id FROM notificaciones)`);

      const deleteAniversarios = `
        DELETE n FROM notificaciones n
        INNER JOIN eventos_sistema e ON e.id = n.evento_id
        WHERE e.tipo_evento = 'ANIVERSARIO_LABORAL'
        AND n.id NOT IN (
          SELECT * FROM (
            SELECT MAX(n2.id) FROM notificaciones n2
            INNER JOIN eventos_sistema e2 ON e2.id = n2.evento_id
            WHERE e2.tipo_evento = 'ANIVERSARIO_LABORAL'
            GROUP BY JSON_EXTRACT(e2.datos_adicionales, '$.empleado_id'), YEAR(e2.fecha_evento)
          ) AS keep_ids
        )
      `;
      const resultAniversarios = await this.notificacionesRepo.query(deleteAniversarios);
      const eliminadosAniversarios = resultAniversarios.affectedRows || 0;
      await this.eventosRepo.query(`DELETE FROM eventos_sistema WHERE tipo_evento = 'ANIVERSARIO_LABORAL' AND id NOT IN (SELECT DISTINCT evento_id FROM notificaciones)`);

      const totalEliminados = eliminadosPacientes + eliminadosEmpleados + eliminadosAniversarios;
      this.logger.log(`Limpieza completada: pacientes=${eliminadosPacientes}, empleados=${eliminadosEmpleados}, aniversarios=${eliminadosAniversarios}, total=${totalEliminados}`);

      return { eliminados_pacientes: eliminadosPacientes, eliminados_empleados: eliminadosEmpleados, eliminados_aniversarios: eliminadosAniversarios, total_eliminados: totalEliminados };
    } catch (error) {
      this.logger.error(`Error al limpiar duplicados: ${error.message}`);
      throw error;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // FILTROS COMPARTIDOS
  // Genera el bloque AND ... que va en el WHERE de las 3 queries de
  // notificaciones. Todos los filtros aquí → LIMIT/OFFSET exactos.
  // Parámetros extra necesarios (en orden): usuarioId, rolId, usuarioId x3
  // ────────────────────────────────────────────────────────────────
  private filtrosSql(): string {
    return `
      AND (
        n.tipo_notificacion NOT LIKE 'TAREA_%'
        OR (
          e.datos_adicionales IS NOT NULL
          AND (
            JSON_CONTAINS(JSON_EXTRACT(e.datos_adicionales, '$.usuarios_destinatarios'), CAST(? AS JSON))
            OR JSON_CONTAINS(JSON_EXTRACT(e.datos_adicionales, '$.roles_destinatarios'), CAST(? AS JSON))
          )
        )
      )
      AND NOT (
        n.tipo_notificacion IN ('SOLICITUD_INFORME', 'DOCUMENTO_SUBIDO')
        AND JSON_EXTRACT(e.datos_adicionales, '$.es_revision') = TRUE
        AND JSON_EXTRACT(e.datos_adicionales, '$.jefe_destinatario_id') IS NOT NULL
        AND CAST(JSON_EXTRACT(e.datos_adicionales, '$.jefe_destinatario_id') AS UNSIGNED) != ?
      )
      AND NOT (
        n.tipo_notificacion = 'DOCUMENTO_SUBIDO'
        AND nd.rol_id = 4
        AND (JSON_EXTRACT(e.datos_adicionales, '$.es_revision') IS NULL
             OR JSON_EXTRACT(e.datos_adicionales, '$.es_revision') = FALSE)
        AND JSON_EXTRACT(e.datos_adicionales, '$.terapeutas_destinatarios') IS NOT NULL
        AND NOT JSON_CONTAINS(JSON_EXTRACT(e.datos_adicionales, '$.terapeutas_destinatarios'), CAST(? AS JSON))
      )
      AND NOT (
        n.tipo_notificacion = 'SOLICITUD_INFORME'
        AND nd.rol_id = 4
        AND (JSON_EXTRACT(e.datos_adicionales, '$.es_revision') IS NULL
             OR JSON_EXTRACT(e.datos_adicionales, '$.es_revision') = FALSE)
        AND (
          JSON_EXTRACT(e.datos_adicionales, '$.terapeutas_destinatarios') IS NULL
          OR NOT JSON_CONTAINS(JSON_EXTRACT(e.datos_adicionales, '$.terapeutas_destinatarios'), CAST(? AS JSON))
        )
      )
    `;
  }
  /** Parámetros que acompañan a filtrosSql() — siempre 5 valores */
  private filtrosParams(usuarioId: number, rolId: number): any[] {
    return [usuarioId, rolId, usuarioId, usuarioId, usuarioId];
  }

  // ────────────────────────────────────────────────────────────────
  // CENTRO OPERATIVO — TAREAS
  // ────────────────────────────────────────────────────────────────

  private async obtenerNombreUsuario(userId: number): Promise<string> {
    const u = await this.trabajadoresRepo.findOne({ where: { id: userId } });
    return u ? `${u.nombres} ${u.apellidos}` : 'Un usuario';
  }

  private async resolverDestinatarios(asignaciones: Array<{ usuario_id?: number; rol_id?: number }>) {
    const usuarioIds: number[] = [];
    const rolIds: number[] = [];
    for (const a of asignaciones) {
      if (a.usuario_id) usuarioIds.push(a.usuario_id);
      else if (a.rol_id) rolIds.push(a.rol_id);
    }
    return { usuarioIds, rolIds };
  }

  async notificarTareaAsignada(
    tareaId: number,
    tituloTarea: string,
    asignadorId: number,
    asignaciones: Array<{ usuario_id?: number }>,
  ) {
    try {
      const destinatarios = asignaciones
        .map(a => a.usuario_id)
        .filter((id): id is number => !!id && id !== asignadorId);

      const asignadorNombre = await this.obtenerNombreUsuario(asignadorId);

      // ── Notificar a los asignados ──
      if (destinatarios.length > 0) {
        const usuarios = await this.trabajadoresRepo.findBy({ id: In(destinatarios) });
        const roles = [...new Set(usuarios.map(u => u.rol?.id ?? ROL_ADMIN))];
        const nombres = usuarios.map(u => `${u.nombres} ${u.apellidos}`).join(', ');
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_ASIGNADA',
          descripcion: `${asignadorNombre} asignó la tarea "${tituloTarea}"`,
          usuario_id: asignadorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, asignador_nombre: asignadorNombre, usuarios_destinatarios: destinatarios, roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_ASIGNADA',
          titulo: 'Nueva tarea asignada',
          mensaje: `${asignadorNombre} te asignó la tarea "${tituloTarea}"`,
          evento_id: ev.id,
          roles_destino: roles,
        });

        // ── Notificar al admin (si el asignador no es admin) ──
        const asignadorRol = await this.obtenerRolDelUsuario(asignadorId);
        if (asignadorRol !== ROL_ADMIN) {
          const ev2 = await this.crearEvento({
            tipo_evento: 'TAREA_ASIGNADA',
            descripcion: `${asignadorNombre} asignó la tarea "${tituloTarea}" a ${nombres}`,
            usuario_id: asignadorId,
            datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, asignador_nombre: asignadorNombre, usuarios_destinatarios: [], roles_destinatarios: [ROL_ADMIN] },
          });
          await this.crearNotificacion({
            tipo_notificacion: 'TAREA_ASIGNADA',
            titulo: 'Tarea asignada',
            mensaje: `${asignadorNombre} asignó "${tituloTarea}" a ${nombres}`,
            evento_id: ev2.id,
            roles_destino: [ROL_ADMIN],
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error al notificar tarea asignada: ${error.message}`);
    }
  }

  async notificarTareaComentada(
    tareaId: number,
    tituloTarea: string,
    comentadorId: number,
    asignaciones: Array<{ usuario_id?: number }>,
    creadorId?: number,
  ) {
    try {
      const comentadorNombre = await this.obtenerNombreUsuario(comentadorId);
      const comentadorRol = await this.obtenerRolDelUsuario(comentadorId);
      const usuarioIds = asignaciones.map(a => a.usuario_id).filter((id): id is number => !!id);

      // ── Asignados (excluye al comentador y al creador) ──
      const destinatariosAsignados = [...new Set(
        usuarioIds.filter(id => id !== comentadorId && id !== creadorId),
      )];
      if (destinatariosAsignados.length > 0) {
        const usuarios = await this.trabajadoresRepo.findBy({ id: In(destinatariosAsignados) });
        const roles = [...new Set(usuarios.map(u => u.rol?.id ?? ROL_ADMIN))];
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_COMENTADA',
          descripcion: `${comentadorNombre} comentó en la tarea "${tituloTarea}"`,
          usuario_id: comentadorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, comentador_nombre: comentadorNombre, usuarios_destinatarios: destinatariosAsignados, roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_COMENTADA',
          titulo: 'Nuevo comentario en tu tarea',
          mensaje: `${comentadorNombre} comentó en tu tarea "${tituloTarea}"`,
          evento_id: ev.id,
          roles_destino: roles,
        });
      }

      // ── Creador (mensaje distinto, si no es el comentador) ──
      if (creadorId && creadorId !== comentadorId) {
        const creador = await this.trabajadoresRepo.findOne({ where: { id: creadorId } });
        if (creador) {
          const ev = await this.crearEvento({
            tipo_evento: 'TAREA_COMENTADA',
            descripcion: `${comentadorNombre} comentó en la tarea "${tituloTarea}"`,
            usuario_id: comentadorId,
            datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, comentador_nombre: comentadorNombre, usuarios_destinatarios: [creadorId], roles_destinatarios: [] },
          });
          await this.crearNotificacion({
            tipo_notificacion: 'TAREA_COMENTADA',
            titulo: 'Comentario en tarea asignada',
            mensaje: `${comentadorNombre} comentó en la tarea que asignaste "${tituloTarea}"`,
            evento_id: ev.id,
            roles_destino: [creador.rol?.id ?? ROL_ADMIN],
          });
        }
      }

      // ── Admin (si el comentador no es admin) ──
      if (comentadorRol !== ROL_ADMIN) {
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_COMENTADA',
          descripcion: `${comentadorNombre} comentó en la tarea "${tituloTarea}"`,
          usuario_id: comentadorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, comentador_nombre: comentadorNombre, usuarios_destinatarios: [], roles_destinatarios: [ROL_ADMIN] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_COMENTADA',
          titulo: 'Comentario en tarea',
          mensaje: `${comentadorNombre} comentó en "${tituloTarea}"`,
          evento_id: ev.id,
          roles_destino: [ROL_ADMIN],
        });
      }
    } catch (error) {
      this.logger.error(`Error al notificar tarea comentada: ${error.message}`);
    }
  }

  async notificarTareaCompletada(
    tareaId: number,
    tituloTarea: string,
    completadoPorId: number,
    creadorId: number,
    asignaciones: Array<{ usuario_id?: number }> = [],
  ) {
    try {
      const [completadoPorNombre, completadoPorRol] = await Promise.all([
        this.obtenerNombreUsuario(completadoPorId),
        this.obtenerRolDelUsuario(completadoPorId),
      ]);

      // ── Otros asignados (no el que completó) ──
      const otrosAsignados = asignaciones
        .map(a => a.usuario_id)
        .filter((id): id is number => !!id && id !== completadoPorId && id !== creadorId);

      if (otrosAsignados.length > 0) {
        const usuarios = await this.trabajadoresRepo.findBy({ id: In(otrosAsignados) });
        const roles = [...new Set(usuarios.map(u => u.rol?.id ?? ROL_ADMIN))];
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_COMPLETADA',
          descripcion: `${completadoPorNombre} completó la tarea "${tituloTarea}"`,
          usuario_id: completadoPorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, completado_por_nombre: completadoPorNombre, usuarios_destinatarios: otrosAsignados, roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_COMPLETADA',
          titulo: 'Tarea completada',
          mensaje: `${completadoPorNombre} completó la tarea "${tituloTarea}"`,
          evento_id: ev.id,
          roles_destino: roles,
        });
      }

      // ── Creador (si no es el que completó) ──
      if (creadorId && creadorId !== completadoPorId) {
        const creador = await this.trabajadoresRepo.findOne({ where: { id: creadorId } });
        if (creador) {
          const ev = await this.crearEvento({
            tipo_evento: 'TAREA_COMPLETADA',
            descripcion: `${completadoPorNombre} completó la tarea "${tituloTarea}"`,
            usuario_id: completadoPorId,
            datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, completado_por_nombre: completadoPorNombre, usuarios_destinatarios: [creadorId], roles_destinatarios: [] },
          });
          await this.crearNotificacion({
            tipo_notificacion: 'TAREA_COMPLETADA',
            titulo: 'Tarea completada',
            mensaje: `${completadoPorNombre} completó tu tarea "${tituloTarea}"`,
            evento_id: ev.id,
            roles_destino: [creador.rol?.id ?? ROL_ADMIN],
          });
        }
      }

      // ── Admin (si el que completó no es admin) ──
      if (completadoPorRol !== ROL_ADMIN) {
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_COMPLETADA',
          descripcion: `${completadoPorNombre} completó la tarea "${tituloTarea}"`,
          usuario_id: completadoPorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, completado_por_nombre: completadoPorNombre, usuarios_destinatarios: [], roles_destinatarios: [ROL_ADMIN] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_COMPLETADA',
          titulo: 'Tarea completada',
          mensaje: `${completadoPorNombre} completó "${tituloTarea}"`,
          evento_id: ev.id,
          roles_destino: [ROL_ADMIN],
        });
      }
    } catch (error) {
      this.logger.error(`Error al notificar tarea completada: ${error.message}`);
    }
  }

  async notificarTareaVencida(
    tareaId: number,
    tituloTarea: string,
    asignaciones: Array<{ usuario_id?: number }>,
    creadorId: number,
  ) {
    try {
      const pendientesIds = asignaciones
        .map(a => a.usuario_id)
        .filter((id): id is number => !!id && id !== creadorId);

      const [pendientes, creador] = await Promise.all([
        pendientesIds.length ? this.trabajadoresRepo.findBy({ id: In(pendientesIds) }) : Promise.resolve([]),
        this.trabajadoresRepo.findOne({ where: { id: creadorId } }),
      ]);

      // ── Una notif por asignado pendiente ──
      for (const u of pendientes) {
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_VENCIDA',
          descripcion: `La tarea "${tituloTarea}" de ${u.nombres} ${u.apellidos} venció`,
          usuario_id: creadorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, usuarios_destinatarios: [u.id], roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_VENCIDA',
          titulo: 'Tarea vencida',
          mensaje: `Tu tarea "${tituloTarea}" ha vencido`,
          evento_id: ev.id,
          roles_destino: [u.rol?.id ?? ROL_ADMIN],
        });
      }

      // ── Creador: una notif agrupada con todos los pendientes ──
      if (creador && pendientes.length > 0 && creadorId !== ROL_ADMIN) {
        const nombresPendientes = pendientes.map(u => `${u.nombres} ${u.apellidos}`).join(', ');
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_VENCIDA',
          descripcion: `La tarea "${tituloTarea}" venció — pendiente de: ${nombresPendientes}`,
          usuario_id: creadorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, usuarios_destinatarios: [creadorId], roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_VENCIDA',
          titulo: 'Tarea vencida',
          mensaje: `"${tituloTarea}" venció — pendiente de: ${nombresPendientes}`,
          evento_id: ev.id,
          roles_destino: [creador.rol?.id ?? ROL_ADMIN],
        });
      }

      // ── Admin ──
      const nombresPendientes = pendientes.map(u => `${u.nombres} ${u.apellidos}`).join(', ') || 'sin asignados';
      const evAdmin = await this.crearEvento({
        tipo_evento: 'TAREA_VENCIDA',
        descripcion: `La tarea "${tituloTarea}" venció`,
        usuario_id: creadorId,
        datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, usuarios_destinatarios: [], roles_destinatarios: [ROL_ADMIN] },
      });
      await this.crearNotificacion({
        tipo_notificacion: 'TAREA_VENCIDA',
        titulo: 'Tarea vencida',
        mensaje: `"${tituloTarea}" venció — pendiente de: ${nombresPendientes}`,
        evento_id: evAdmin.id,
        roles_destino: [ROL_ADMIN],
      });
    } catch (error) {
      this.logger.error(`Error al notificar tarea vencida: ${error.message}`);
    }
  }

  async notificarTareaMovida(
    tareaId: number,
    tituloTarea: string,
    movioId: number,
    creadorId: number,
    nombreColumna: string,
    asignaciones: Array<{ usuario_id?: number }> = [],
  ) {
    try {
      const [movioNombre, movioRol] = await Promise.all([
        this.obtenerNombreUsuario(movioId),
        this.obtenerRolDelUsuario(movioId),
      ]);

      // ── Otros asignados (no el que movió, no el creador) ──
      const otrosAsignados = asignaciones
        .map(a => a.usuario_id)
        .filter((id): id is number => !!id && id !== movioId && id !== creadorId);

      if (otrosAsignados.length > 0) {
        const usuarios = await this.trabajadoresRepo.findBy({ id: In(otrosAsignados) });
        const roles = [...new Set(usuarios.map(u => u.rol?.id ?? ROL_ADMIN))];
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_MOVIDA',
          descripcion: `${movioNombre} movió "${tituloTarea}" a "${nombreColumna}"`,
          usuario_id: movioId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, movio_nombre: movioNombre, columna_destino: nombreColumna, usuarios_destinatarios: otrosAsignados, roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_MOVIDA',
          titulo: 'Tarea actualizada',
          mensaje: `${movioNombre} movió "${tituloTarea}" a "${nombreColumna}"`,
          evento_id: ev.id,
          roles_destino: roles,
        });
      }

      // ── Creador (mensaje distinto, si no es el que movió) ──
      if (creadorId && creadorId !== movioId) {
        const creador = await this.trabajadoresRepo.findOne({ where: { id: creadorId } });
        if (creador) {
          const ev = await this.crearEvento({
            tipo_evento: 'TAREA_MOVIDA',
            descripcion: `${movioNombre} movió tu tarea "${tituloTarea}" a "${nombreColumna}"`,
            usuario_id: movioId,
            datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, movio_nombre: movioNombre, columna_destino: nombreColumna, usuarios_destinatarios: [creadorId], roles_destinatarios: [] },
          });
          await this.crearNotificacion({
            tipo_notificacion: 'TAREA_MOVIDA',
            titulo: 'Tu tarea fue actualizada',
            mensaje: `${movioNombre} movió tu tarea "${tituloTarea}" a "${nombreColumna}"`,
            evento_id: ev.id,
            roles_destino: [creador.rol?.id ?? ROL_ADMIN],
          });
        }
      }

      // ── Admin (si el que movió no es admin) ──
      if (movioRol !== ROL_ADMIN) {
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_MOVIDA',
          descripcion: `${movioNombre} movió "${tituloTarea}" a "${nombreColumna}"`,
          usuario_id: movioId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, movio_nombre: movioNombre, columna_destino: nombreColumna, usuarios_destinatarios: [], roles_destinatarios: [ROL_ADMIN] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_MOVIDA',
          titulo: 'Tarea actualizada',
          mensaje: `${movioNombre} movió "${tituloTarea}" a "${nombreColumna}"`,
          evento_id: ev.id,
          roles_destino: [ROL_ADMIN],
        });
      }
    } catch (error) {
      this.logger.error(`Error al notificar tarea movida: ${error.message}`);
    }
  }

  async notificarTareaArchivoSubido(
    tareaId: number,
    tituloTarea: string,
    subioPorId: number,
    asignaciones: Array<{ usuario_id?: number }>,
    creadorId?: number,
  ) {
    try {
      const [subioPorNombre, subioPorRol] = await Promise.all([
        this.obtenerNombreUsuario(subioPorId),
        this.obtenerRolDelUsuario(subioPorId),
      ]);
      const usuarioIds = asignaciones.map(a => a.usuario_id).filter((id): id is number => !!id);

      // ── Notificar a todos los demás (asignados + creador si distinto) ──
      const destinatarios = [...new Set([
        ...usuarioIds.filter(id => id !== subioPorId),
        ...(creadorId && creadorId !== subioPorId ? [creadorId] : []),
      ])];

      if (destinatarios.length > 0) {
        const usuarios = await this.trabajadoresRepo.findBy({ id: In(destinatarios) });
        const roles = [...new Set(usuarios.map(u => u.rol?.id ?? ROL_ADMIN))];
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_ARCHIVO_SUBIDO',
          descripcion: `${subioPorNombre} subió un archivo en la tarea "${tituloTarea}"`,
          usuario_id: subioPorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, subio_nombre: subioPorNombre, usuarios_destinatarios: destinatarios, roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_ARCHIVO_SUBIDO',
          titulo: 'Nuevo archivo en tarea',
          mensaje: `${subioPorNombre} subió un archivo en "${tituloTarea}"`,
          evento_id: ev.id,
          roles_destino: roles,
        });
      }

      // ── Admin (si el que subió no es admin) ──
      if (subioPorRol !== ROL_ADMIN) {
        const ev = await this.crearEvento({
          tipo_evento: 'TAREA_ARCHIVO_SUBIDO',
          descripcion: `${subioPorNombre} subió un archivo en la tarea "${tituloTarea}"`,
          usuario_id: subioPorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, subio_nombre: subioPorNombre, usuarios_destinatarios: [], roles_destinatarios: [ROL_ADMIN] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_ARCHIVO_SUBIDO',
          titulo: 'Nuevo archivo en tarea',
          mensaje: `${subioPorNombre} subió un archivo en "${tituloTarea}"`,
          evento_id: ev.id,
          roles_destino: [ROL_ADMIN],
        });
      }
    } catch (error) {
      this.logger.error(`Error al notificar archivo subido en tarea: ${error.message}`);
    }
  }

  async notificarSesionesTerapia24(
    pacienteId: number,
    pacienteNombre: string,
    terapeutaId: number,
    terapeutaNombre: string,
    servicioId: number,
    servicioNombre: string,
    sesionesCumplidas: number,
  ) {
    try {
      const datosBase = {
        paciente_id: pacienteId,
        paciente_nombre: pacienteNombre,
        terapeuta_id: terapeutaId,
        terapeuta_nombre: terapeutaNombre,
        servicio_id: servicioId,
        servicio_nombre: servicioNombre,
        sesiones_cumplidas: sesionesCumplidas,
      };

      const mensajeSesiones = `El paciente ${pacienteNombre} ha cumplido ${sesionesCumplidas} sesiones de ${servicioNombre} con el terapeuta ${terapeutaNombre}. Por favor, realizar el reporte de evolución correspondiente y replantear los objetivos terapéuticos según los avances observados.`;
      const tituloSesiones = `${pacienteNombre} cumple ${sesionesCumplidas} sesiones de ${servicioNombre}`;

      // ── Notificación al TERAPEUTA ──
      const terapeuta = await this.trabajadoresRepo.findOne({ where: { id: terapeutaId } });
      if (terapeuta) {
        const evTerapeuta = await this.crearEvento({
          tipo_evento: 'SESIONES_TERAPIA_24',
          descripcion: mensajeSesiones,
          usuario_id: terapeutaId,
          datos_adicionales: { ...datosBase, usuarios_destinatarios: [terapeutaId], roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'SESIONES_TERAPIA_24',
          titulo: tituloSesiones,
          mensaje: mensajeSesiones,
          evento_id: evTerapeuta.id,
          roles_destino: [terapeuta.rol?.id ?? ROL_TERAPEUTA],
        });
      }

      // ── Notificación al ADMINISTRADOR ──
      const evAdmin = await this.crearEvento({
        tipo_evento: 'SESIONES_TERAPIA_24',
        descripcion: mensajeSesiones,
        usuario_id: terapeutaId,
        datos_adicionales: { ...datosBase, usuarios_destinatarios: [], roles_destinatarios: [ROL_ADMIN] },
      });
      await this.crearNotificacion({
        tipo_notificacion: 'SESIONES_TERAPIA_24',
        titulo: tituloSesiones,
        mensaje: mensajeSesiones,
        evento_id: evAdmin.id,
        roles_destino: [ROL_ADMIN],
      });

      this.logger.log(`Notificación sesiones-24 generada: ${pacienteNombre} (${sesionesCumplidas} sesiones)`);
    } catch (error) {
      this.logger.error(`Error al notificar sesiones terapia 24: ${error.message}`);
    }
  }

  async notificarCambioEstadoPaciente(
    pacienteNombre: string,
    servicioNombre: string,
    estadoAnterior: string,
    estadoNuevo: string,
    pacienteId: number,
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'CAMBIO_ESTADO_SERVICIO',
      descripcion: `Estado del servicio ${servicioNombre} de ${pacienteNombre} cambió de "${estadoAnterior}" a "${estadoNuevo}"`,
      usuario_id: 1,
      datos_adicionales: { paciente_id: pacienteId, paciente_nombre: pacienteNombre, servicio_nombre: servicioNombre, estado_anterior: estadoAnterior, estado_nuevo: estadoNuevo },
    });
    await this.crearNotificacion({
      tipo_notificacion: 'CAMBIO_ESTADO_SERVICIO',
      titulo: 'Cambio de estado de servicio',
      mensaje: `${pacienteNombre} - ${servicioNombre}: "${estadoAnterior}" -> "${estadoNuevo}"`,
      evento_id: evento.id,
      roles_destino: [ROL_ADMIN, ROL_ADMISION],
    });
  }
}