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
          n.id,
          n.tipo_notificacion,
          n.titulo,
          n.mensaje,
          n.fecha_creacion,
          e.tipo_evento,
          e.descripcion as evento_descripcion,
          e.datos_adicionales,
          e.fecha_evento,
          CASE WHEN nl.id IS NOT NULL THEN 1 ELSE 0 END as leida
        FROM notificaciones n
        INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
        INNER JOIN eventos_sistema e ON e.id = n.evento_id
        LEFT JOIN notificaciones_leidas nl ON nl.notificacion_id = n.id AND nl.usuario_id = ?
        WHERE nd.rol_id = ?
          AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY n.fecha_creacion DESC
        LIMIT ?
      `;
      const notificaciones = await this.notificacionesRepo.query(query, [usuarioId, rolId, limite]);

      // Filtrar notificaciones específicas para terapeutas
      const notificacionesFiltradas = notificaciones.filter(notif => {
        if (rolId === ROL_TERAPEUTA) {
          // Para SOLICITUD_INFORME y DOCUMENTO_SUBIDO, solo mostrar si la terapeuta está en la lista
          if (
            (notif.tipo_notificacion === 'DOCUMENTO_SUBIDO' || notif.tipo_notificacion === 'SOLICITUD_INFORME') &&
            notif.datos_adicionales
          ) {
            try {
              const datos = JSON.parse(notif.datos_adicionales);

              // Si es una notificación de revisión (para jefas), solo mostrarla si es la jefa asignada
              if (datos.es_revision === true) {
                // Si tiene jefe_destinatario_id, solo mostrar si coincide con el usuario actual
                if (datos.jefe_destinatario_id) {
                  return datos.jefe_destinatario_id === usuarioId;
                }
                // Si no tiene jefe_destinatario_id, mostrarla (compatibilidad con notificaciones antiguas)
                return true;
              }

              // Solo mostrar si existe terapeutas_destinatarios Y contiene a este usuario
              if (datos.terapeutas_destinatarios && Array.isArray(datos.terapeutas_destinatarios)) {
                return datos.terapeutas_destinatarios.includes(usuarioId);
              }
              // Si no existe terapeutas_destinatarios para SOLICITUD_INFORME, NO mostrar
              if (notif.tipo_notificacion === 'SOLICITUD_INFORME') {
                return false;
              }
              // Para DOCUMENTO_SUBIDO sin terapeutas_destinatarios, mostrar (compatibilidad)
              return notif.tipo_notificacion === 'DOCUMENTO_SUBIDO';
            } catch {
              return false;
            }
          }
        }
        // Para ROL_ADMIN, filtrar notificaciones de revisión
        if (rolId === ROL_ADMIN) {
          if (notif.tipo_notificacion === 'SOLICITUD_INFORME' && notif.datos_adicionales) {
            try {
              const datos = JSON.parse(notif.datos_adicionales);
              if (datos.es_revision === true && datos.jefe_destinatario_id) {
                return datos.jefe_destinatario_id === usuarioId;
              }
            } catch {
              return false;
            }
          }
        }
        // Notificaciones de tareas del Centro Operativo
        if (notif.tipo_notificacion?.startsWith('TAREA_')) {
          try {
            const datos = notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null;
            if (!datos) return false;
            const uid = Number(usuarioId);
            const rid = Number(rolId);
            const enUsuarios = Array.isArray(datos.usuarios_destinatarios) && datos.usuarios_destinatarios.map(Number).includes(uid);
            const enRoles = Array.isArray(datos.roles_destinatarios) && datos.roles_destinatarios.map(Number).includes(rid);
            return enUsuarios || enRoles;
          } catch {
            return false;
          }
        }
        return true;
      });

      return notificacionesFiltradas.map(notif => ({
        ...notif,
        datos_adicionales: notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null,
        leida: notif.leida === 1,
      }));
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
  ): Promise<any[]> {
    try {
      const condFecha = fecha
        ? `AND DATE(CONVERT_TZ(n.fecha_creacion, '+00:00', '-05:00')) = '${fecha}'`
        : `AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
      const condTipo = tipo ? `AND n.tipo_notificacion = '${tipo}'` : '';

      const query = `
        SELECT
          n.id,
          n.tipo_notificacion,
          n.titulo,
          n.mensaje,
          n.fecha_creacion,
          e.tipo_evento,
          e.datos_adicionales,
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
        ORDER BY n.fecha_creacion DESC
        LIMIT ? OFFSET ?
      `;
      const notificaciones = await this.notificacionesRepo.query(query, [usuarioId, rolId, limite, offset]);

      // Solo los terapeutas tienen filtro adicional en DOCUMENTO_SUBIDO y SOLICITUD_INFORME.
      // Admin y admisión ven todas las notificaciones de su rol sin restricción extra.
      const notificacionesFiltradas = notificaciones.filter(notif => {
        if (rolId === ROL_TERAPEUTA) {
          // Para SOLICITUD_INFORME y DOCUMENTO_SUBIDO, solo mostrar si la terapeuta está en la lista
          if (
            (notif.tipo_notificacion === 'DOCUMENTO_SUBIDO' || notif.tipo_notificacion === 'SOLICITUD_INFORME') &&
            notif.datos_adicionales
          ) {
            try {
              const datos = JSON.parse(notif.datos_adicionales);

              // Si es una notificación de revisión (para jefas), solo mostrarla si es la jefa asignada
              if (datos.es_revision === true) {
                // Si tiene jefe_destinatario_id, solo mostrar si coincide con el usuario actual
                if (datos.jefe_destinatario_id) {
                  return datos.jefe_destinatario_id === usuarioId;
                }
                // Si no tiene jefe_destinatario_id, mostrarla (compatibilidad con notificaciones antiguas)
                return true;
              }

              // Solo mostrar si existe terapeutas_destinatarios Y contiene a este usuario
              if (datos.terapeutas_destinatarios && Array.isArray(datos.terapeutas_destinatarios)) {
                return datos.terapeutas_destinatarios.includes(usuarioId);
              }
              // Si no existe terapeutas_destinatarios para SOLICITUD_INFORME, NO mostrar
              if (notif.tipo_notificacion === 'SOLICITUD_INFORME') {
                return false;
              }
              // Para DOCUMENTO_SUBIDO sin terapeutas_destinatarios, mostrar (compatibilidad)
              return notif.tipo_notificacion === 'DOCUMENTO_SUBIDO';
            } catch {
              return false;
            }
          }
        }
        // Para ROL_ADMIN, filtrar notificaciones de revisión
        if (rolId === ROL_ADMIN) {
          if (notif.tipo_notificacion === 'SOLICITUD_INFORME' && notif.datos_adicionales) {
            try {
              const datos = JSON.parse(notif.datos_adicionales);
              if (datos.es_revision === true && datos.jefe_destinatario_id) {
                return datos.jefe_destinatario_id === usuarioId;
              }
            } catch {
              return false;
            }
          }
        }
        // Notificaciones de tareas del Centro Operativo
        if (notif.tipo_notificacion?.startsWith('TAREA_')) {
          try {
            const datos = notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null;
            if (!datos) return false;
            const uid = Number(usuarioId);
            const rid = Number(rolId);
            const enUsuarios = Array.isArray(datos.usuarios_destinatarios) && datos.usuarios_destinatarios.map(Number).includes(uid);
            const enRoles = Array.isArray(datos.roles_destinatarios) && datos.roles_destinatarios.map(Number).includes(rid);
            return enUsuarios || enRoles;
          } catch {
            return false;
          }
        }
        return true;
      });

      return notificacionesFiltradas.map(notif => {
        const leidaBoolean =
          notif.leida === 1 ||
          notif.leida === true ||
          notif.leida === '1' ||
          notif.leida === 'true' ||
          !!notif.notif_leida_id;

        const datosAdicionales = notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null;

        let terapeutaNombre: string | null = null;
        if (datosAdicionales) {
          if (notif.tipo_notificacion === 'CITA_MODIFICADA') {
            terapeutaNombre =
              datosAdicionales.terapeuta_nombre ||
              datosAdicionales.terapeuta_nuevo ||
              datosAdicionales.terapeuta_anterior ||
              null;
          } else if (
            notif.tipo_notificacion === 'CITA_ELIMINADA' ||
            notif.tipo_notificacion === 'NOTA_EVOLUCION'
          ) {
            terapeutaNombre = datosAdicionales.terapeuta_nombre || null;
          }
        }

        return {
          ...notif,
          datos_adicionales: datosAdicionales,
          leida: leidaBoolean,
          terapeuta_nombre: terapeutaNombre,
        };
      });
    } catch (error) {
      this.logger.error(`Error al obtener notificaciones recientes: ${error.message}`);
      throw error;
    }
  }

  async contarNotificacionesPorRol(rolId: number, usuarioId: number): Promise<number> {
    try {
      const query = `
        SELECT n.id, n.tipo_notificacion, e.datos_adicionales
        FROM notificaciones n
        INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
        INNER JOIN eventos_sistema e ON e.id = n.evento_id
        LEFT JOIN notificaciones_leidas nl ON nl.notificacion_id = n.id AND nl.usuario_id = ?
        WHERE nd.rol_id = ?
          AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND nl.id IS NULL
      `;
      const notificaciones = await this.notificacionesRepo.query(query, [usuarioId, rolId]);

      // Aplicar los mismos filtros que en obtenerNotificacionesRecientes()
      const notificacionesFiltradas = notificaciones.filter(notif => {
        if (rolId === ROL_TERAPEUTA) {
          // Para SOLICITUD_INFORME y DOCUMENTO_SUBIDO, solo contar si la terapeuta está en la lista
          if (
            (notif.tipo_notificacion === 'DOCUMENTO_SUBIDO' || notif.tipo_notificacion === 'SOLICITUD_INFORME') &&
            notif.datos_adicionales
          ) {
            try {
              const datos = JSON.parse(notif.datos_adicionales);

              // Si es una notificación de revisión (para jefas), solo contarla si es la jefa asignada
              if (datos.es_revision === true) {
                // Si tiene jefe_destinatario_id, solo contar si coincide con el usuario actual
                if (datos.jefe_destinatario_id) {
                  return datos.jefe_destinatario_id === usuarioId;
                }
                // Si no tiene jefe_destinatario_id, contarla (compatibilidad con notificaciones antiguas)
                return true;
              }

              // Solo contar si existe terapeutas_destinatarios Y contiene a este usuario
              if (datos.terapeutas_destinatarios && Array.isArray(datos.terapeutas_destinatarios)) {
                return datos.terapeutas_destinatarios.includes(usuarioId);
              }
              // Si no existe terapeutas_destinatarios para SOLICITUD_INFORME, NO contar
              if (notif.tipo_notificacion === 'SOLICITUD_INFORME') {
                return false;
              }
              // Para DOCUMENTO_SUBIDO sin terapeutas_destinatarios, contar (compatibilidad)
              return notif.tipo_notificacion === 'DOCUMENTO_SUBIDO';
            } catch {
              return false;
            }
          }
        }
        // Para ROL_ADMIN, filtrar notificaciones de revisión
        if (rolId === ROL_ADMIN) {
          if (notif.tipo_notificacion === 'SOLICITUD_INFORME' && notif.datos_adicionales) {
            try {
              const datos = JSON.parse(notif.datos_adicionales);
              if (datos.es_revision === true && datos.jefe_destinatario_id) {
                return datos.jefe_destinatario_id === usuarioId;
              }
            } catch {
              return false;
            }
          }
        }
        // Notificaciones de tareas del Centro Operativo
        if (notif.tipo_notificacion?.startsWith('TAREA_')) {
          try {
            const datos = notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null;
            if (!datos) return false;
            const uid = Number(usuarioId);
            const rid = Number(rolId);
            const enUsuarios = Array.isArray(datos.usuarios_destinatarios) && datos.usuarios_destinatarios.map(Number).includes(uid);
            const enRoles = Array.isArray(datos.roles_destinatarios) && datos.roles_destinatarios.map(Number).includes(rid);
            return enUsuarios || enRoles;
          } catch {
            return false;
          }
        }
        return true;
      });

      return notificacionesFiltradas.length;
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
    asignaciones: Array<{ usuario_id?: number; rol_id?: number }>,
  ) {
    try {
      const { usuarioIds, rolIds } = await this.resolverDestinatarios(asignaciones);
      const destinatarios = usuarioIds.filter(id => id !== asignadorId);
      if (destinatarios.length === 0 && rolIds.length === 0) return;

      const asignadorNombre = await this.obtenerNombreUsuario(asignadorId);
      const rolesDestino = rolIds.length > 0 ? rolIds : TODOS_LOS_ROLES;

      const evento = await this.crearEvento({
        tipo_evento: 'TAREA_ASIGNADA',
        descripcion: `${asignadorNombre} asignó la tarea "${tituloTarea}"`,
        usuario_id: asignadorId,
        datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, asignador_nombre: asignadorNombre, usuarios_destinatarios: destinatarios, roles_destinatarios: rolIds },
      });
      await this.crearNotificacion({
        tipo_notificacion: 'TAREA_ASIGNADA',
        titulo: 'Nueva tarea asignada',
        mensaje: `${asignadorNombre} te asignó la tarea "${tituloTarea}"`,
        evento_id: evento.id,
        roles_destino: [...new Set(rolesDestino)],
      });
    } catch (error) {
      this.logger.error(`Error al notificar tarea asignada: ${error.message}`);
    }
  }

  async notificarTareaComentada(
    tareaId: number,
    tituloTarea: string,
    comentadorId: number,
    asignaciones: Array<{ usuario_id?: number; rol_id?: number }>,
    creadorId?: number,
  ) {
    try {
      const { usuarioIds, rolIds } = await this.resolverDestinatarios(asignaciones);

      // Asignados + creador, sin el que comentó
      const todosIds = [...usuarioIds];
      if (creadorId && creadorId !== comentadorId) todosIds.push(creadorId);
      const destinatarios = [...new Set(todosIds.filter(id => id !== comentadorId))];

      if (destinatarios.length === 0 && rolIds.length === 0) return;

      const comentadorNombre = await this.obtenerNombreUsuario(comentadorId);
      const rolesDestino = rolIds.length > 0 ? rolIds : TODOS_LOS_ROLES;

      const evento = await this.crearEvento({
        tipo_evento: 'TAREA_COMENTADA',
        descripcion: `${comentadorNombre} comentó en la tarea "${tituloTarea}"`,
        usuario_id: comentadorId,
        datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, comentador_nombre: comentadorNombre, usuarios_destinatarios: destinatarios, roles_destinatarios: rolIds },
      });
      await this.crearNotificacion({
        tipo_notificacion: 'TAREA_COMENTADA',
        titulo: 'Nuevo comentario en tarea',
        mensaje: `${comentadorNombre} comentó en la tarea "${tituloTarea}"`,
        evento_id: evento.id,
        roles_destino: [...new Set(rolesDestino)],
      });
    } catch (error) {
      this.logger.error(`Error al notificar tarea comentada: ${error.message}`);
    }
  }

  async notificarTareaCompletada(
    tareaId: number,
    tituloTarea: string,
    completadoPorId: number,
    creadorId: number,
  ) {
    try {
      if (creadorId === completadoPorId) return;
      const completadoPorNombre = await this.obtenerNombreUsuario(completadoPorId);
      const creador = await this.trabajadoresRepo.findOne({ where: { id: creadorId } });
      if (!creador) return;

      const evento = await this.crearEvento({
        tipo_evento: 'TAREA_COMPLETADA',
        descripcion: `${completadoPorNombre} completó la tarea "${tituloTarea}"`,
        usuario_id: completadoPorId,
        datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, completado_por_nombre: completadoPorNombre, usuarios_destinatarios: [creadorId], roles_destinatarios: [] },
      });
      await this.crearNotificacion({
        tipo_notificacion: 'TAREA_COMPLETADA',
        titulo: 'Tarea completada',
        mensaje: `${completadoPorNombre} completó la tarea "${tituloTarea}"`,
        evento_id: evento.id,
        roles_destino: [creador.rol?.id ?? ROL_ADMIN],
      });
    } catch (error) {
      this.logger.error(`Error al notificar tarea completada: ${error.message}`);
    }
  }

  async notificarTareaVencida(
    tareaId: number,
    tituloTarea: string,
    asignaciones: Array<{ usuario_id?: number; rol_id?: number }>,
    creadorId: number,
  ) {
    try {
      const { usuarioIds, rolIds } = await this.resolverDestinatarios(asignaciones);

      // ── 1. Notificación para el CREADOR con mensaje descriptivo ──
      if (creadorId) {
        const creador = await this.trabajadoresRepo.findOne({ where: { id: creadorId } });
        let textoAsignados = '';
        if (usuarioIds.length > 0) {
          const usuarios = await this.trabajadoresRepo.findBy({ id: In(usuarioIds) });
          const nombres = usuarios.map(u => `${u.nombres} ${u.apellidos}`);
          textoAsignados = nombres.length === 1
            ? ` que asignaste a ${nombres[0]}`
            : ` que asignaste a ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
        }
        const eventoCreador = await this.crearEvento({
          tipo_evento: 'TAREA_VENCIDA',
          descripcion: `La tarea "${tituloTarea}" venció sin completarse`,
          usuario_id: creadorId,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, usuarios_destinatarios: [creadorId], roles_destinatarios: [] },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_VENCIDA',
          titulo: 'Tarea vencida',
          mensaje: `La tarea "${tituloTarea}"${textoAsignados} venció sin completarse`,
          evento_id: eventoCreador.id,
          roles_destino: [creador?.rol?.id ?? ROL_ADMIN],
        });
      }

      // ── 2. Notificación para los ASIGNADOS (excluye al creador) ──
      const asignadosSinCreador = usuarioIds.filter(id => id !== creadorId);
      if (asignadosSinCreador.length > 0 || rolIds.length > 0) {
        const rolesDestino = rolIds.length > 0 ? rolIds : TODOS_LOS_ROLES;
        const eventoAsignados = await this.crearEvento({
          tipo_evento: 'TAREA_VENCIDA',
          descripcion: `La tarea "${tituloTarea}" venció sin completarse`,
          usuario_id: creadorId ?? 1,
          datos_adicionales: { tarea_id: tareaId, titulo_tarea: tituloTarea, usuarios_destinatarios: asignadosSinCreador, roles_destinatarios: rolIds },
        });
        await this.crearNotificacion({
          tipo_notificacion: 'TAREA_VENCIDA',
          titulo: 'Tarea vencida',
          mensaje: `La tarea "${tituloTarea}" que tienes asignada venció sin completarse`,
          evento_id: eventoAsignados.id,
          roles_destino: [...new Set(rolesDestino)],
        });
      }
    } catch (error) {
      this.logger.error(`Error al notificar tarea vencida: ${error.message}`);
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