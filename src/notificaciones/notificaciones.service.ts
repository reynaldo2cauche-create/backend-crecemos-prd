import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventoSistema } from './entities/evento-sistema.entity';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionDestino } from './entities/notificacion-destino.entity';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';
import { NotificacionLeida } from './entities/notificacion-leida.entity';

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
    @InjectRepository(NotificacionLeida) // ⚠️ INYECTAR ESTO
    private leidasRepo: Repository<NotificacionLeida>,
  ) {}

  /**
   * Crea un evento en el sistema
   */
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

  /**
   * Crea una notificación y la asigna a los roles correspondientes
   */
  async crearNotificacion(dto: CrearNotificacionDto): Promise<Notificacion> {
    try {
      // Crear la notificación
      const notificacion = this.notificacionesRepo.create({
        tipo_notificacion: dto.tipo_notificacion,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        evento_id: dto.evento_id,
      });

      const notificacionGuardada = await this.notificacionesRepo.save(notificacion);

      // Crear las relaciones con los roles destino en notificaciones_destino
      const destinos = dto.roles_destino.map(rol_id => {
        return this.destinosRepo.create({
          notificacion_id: notificacionGuardada.id,
          rol_id,
        });
      });

      await this.destinosRepo.save(destinos);

      this.logger.log(`Notificación creada: ${dto.titulo} - ID: ${notificacionGuardada.id} - Roles: [${dto.roles_destino.join(', ')}]`);

      return notificacionGuardada;
    } catch (error) {
      this.logger.error(`Error al crear notificación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene todas las notificaciones para un rol específico
   * Incluye tanto las leídas como las no leídas (estilo Facebook)
   */
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

      // Parsear datos_adicionales JSON y convertir leida a boolean
      return notificaciones.map(notif => ({
        ...notif,
        datos_adicionales: notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null,
        leida: notif.leida === 1, // Convertir a boolean
      }));
    } catch (error) {
      this.logger.error(`Error al obtener notificaciones: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene notificaciones del último mes (leídas y no leídas)
   * Si existe en notificaciones_leidas → leida = true
   * Si NO existe en notificaciones_leidas → leida = false
   */
async obtenerNotificacionesRecientes(
  rolId: number,
  usuarioId: number,
  limite: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {

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
        CASE 
          WHEN nl.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END as leida
      FROM notificaciones n
      INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
      INNER JOIN eventos_sistema e ON e.id = n.evento_id
      LEFT JOIN notificaciones_leidas nl ON nl.notificacion_id = n.id AND nl.usuario_id = ?
      WHERE nd.rol_id = ?
        AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY n.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `;



    const notificaciones = await this.notificacionesRepo.query(query, [
      usuarioId,
      rolId,
      limite,
      offset
    ]);


    // 🔴 DEPURACIÓN CRÍTICA - Verificar el estado leída
    if (notificaciones.length > 0) {
   
      notificaciones.slice(0, 3).forEach(n => {
   
      });
    }

    // 🔴 PROCESAR correctamente los resultados
    const notificacionesProcesadas = notificaciones.map(notif => {
      // MySQL puede devolver 1/0, TRUE/FALSE, o números
      let leidaBoolean = false;
      
      if (notif.leida === 1 || notif.leida === true || notif.leida === '1' || notif.leida === 'true') {
        leidaBoolean = true;
      }
      
      if (notif.notif_leida_id) {
        leidaBoolean = true;
      }
      
      const resultado = {
        ...notif,
        datos_adicionales: notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null,
        tiempo_relativo: this.formatearTiempoRelativo(notif.minutos_transcurridos),
        leida: leidaBoolean // Siempre boolean
      };
      
  
      
      return resultado;
    });

    return notificacionesProcesadas;
    
  } catch (error) {
    console.error('❌ [SERVICE] Error al obtener notificaciones recientes:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}
  /**
   * Cuenta SOLO las notificaciones NO LEÍDAS
   * (las que NO están en notificaciones_leidas)
   */
  async contarNotificacionesPorRol(rolId: number, usuarioId: number): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM notificaciones n
        INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
        LEFT JOIN notificaciones_leidas nl ON nl.notificacion_id = n.id AND nl.usuario_id = ?
        WHERE nd.rol_id = ?
          AND n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND nl.id IS NULL
      `;

      const result = await this.notificacionesRepo.query(query, [usuarioId, rolId]);
      return parseInt(result[0].total);
    } catch (error) {
      this.logger.error(`Error al contar notificaciones: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marca una notificación como leída
   */
async marcarComoLeida(notificacionId: number, usuarioId: number): Promise<{ success: boolean, nuevoConteo?: number }> {
  try {


    // ✅ VERIFICAR SI LA NOTIFICACIÓN EXISTE
    const notificacionExiste = await this.notificacionesRepo.findOne({
      where: { id: notificacionId }
    });

    if (!notificacionExiste) {
      console.error('❌ Notificación no existe:', notificacionId);
      throw new Error(`Notificación ${notificacionId} no encontrada`);
    }

    // ✅ VERIFICAR SI YA ESTÁ MARCADA COMO LEÍDA
    const yaLeida = await this.leidasRepo.findOne({
      where: {
        notificacion_id: notificacionId,
        usuario_id: usuarioId
      }
    });

    if (yaLeida) {
     
      
      // Devolver el conteo actualizado de todas formas
      const nuevoConteo = await this.contarNotificacionesPorRol(
        (await this.obtenerRolDelUsuario(usuarioId)), 
        usuarioId
      );
      
      return { success: true, nuevoConteo };
    }

    // ✅ CREAR E INSERTAR EL REGISTRO
    const nuevaLeida = this.leidasRepo.create({
      notificacion_id: notificacionId,
      usuario_id: usuarioId,
      fecha_lectura: new Date()
    });

    const resultado = await this.leidasRepo.save(nuevaLeida);


    // ✅ VERIFICAR QUE SE INSERTÓ CORRECTAMENTE
    const verificar = await this.leidasRepo.count({
      where: {
        notificacion_id: notificacionId,
        usuario_id: usuarioId
      }
    });


    if (verificar === 0) {
      throw new Error('Error: No se pudo insertar en notificaciones_leidas');
    }

    // ✅ OBTENER NUEVO CONTEO
    const rolId = await this.obtenerRolDelUsuario(usuarioId);
    const nuevoConteo = await this.contarNotificacionesPorRol(rolId, usuarioId);


    return { success: true, nuevoConteo };

  } catch (error) {
    console.error('🔴🔴🔴 ERROR EN marcarComoLeida:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// 🔴 AGREGAR ESTE MÉTODO AUXILIAR:
private async obtenerRolDelUsuario(usuarioId: number): Promise<number> {
  // Esto es un ejemplo - ajusta según tu estructura
  const query = `SELECT rol_id FROM trabajador_centro WHERE id = ? LIMIT 1`;
  const resultado = await this.notificacionesRepo.query(query, [usuarioId]);
  return resultado[0]?.rol_id || 1; // Default 1 si no encuentra
}

  /**
   * Marca todas las notificaciones NO LEÍDAS como leídas
   */
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
   

      if (notificaciones.length === 0) {
       
        return;
      }

      let marcadasExitosamente = 0;
      for (const notif of notificaciones) {
        try {
          await this.marcarComoLeida(notif.id, usuarioId);
          marcadasExitosamente++;
        } catch (error) {
          console.error(`❌ Error al marcar notificación ${notif.id}:`, error.message);
        }
      }


      this.logger.log(`${marcadasExitosamente} notificaciones marcadas como leídas por usuario ${usuarioId}`);
    } catch (error) {
      console.error('❌ Error al marcar todas como leídas:', error);
      this.logger.error(`Error al marcar todas como leídas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Formatea el tiempo transcurrido en un formato legible
   */
  private formatearTiempoRelativo(minutos: number): string {
    if (minutos < 1) return 'Hace menos de 1 min';
    if (minutos < 60) return `Hace ${Math.floor(minutos)} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;

    const dias = Math.floor(horas / 24);
    return `Hace ${dias} d`;
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
    usuarioCreador: number
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'ANIVERSARIO_LABORAL',
      descripcion: `${nombreEmpleado} cumple ${anosServicio} años de servicio`,
      usuario_id: usuarioCreador,
      datos_adicionales: {
        empleado_id: empleadoId,
        nombre_empleado: nombreEmpleado,
        fecha_ingreso: fechaIngreso,
        anos_servicio: anosServicio,
        cargo: cargo,
      },
    });

    await this.crearNotificacion({
      tipo_notificacion: 'ANIVERSARIO',
      titulo: 'Aniversario Laboral',
      mensaje: `${nombreEmpleado} cumplirá ${anosServicio} años en la empresa el ${fechaIngreso}. Cargo: ${cargo}.`,
      evento_id: evento.id,
      roles_destino: [1],
    });
  }

  async notificarCumpleanospPaciente(
    pacienteId: number,
    nombrePaciente: string,
    fechaNacimiento: string,
    edad: number,
    usuarioCreador: number,
    rolesDestino: number[]
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'CUMPLEANOS_PACIENTE',
      descripcion: `${nombrePaciente} cumplirá ${edad} años`,
      usuario_id: usuarioCreador,
      datos_adicionales: {
        paciente_id: pacienteId,
        nombre_paciente: nombrePaciente,
        fecha_nacimiento: fechaNacimiento,
        edad: edad,
      },
    });

    await this.crearNotificacion({
      tipo_notificacion: 'CUMPLEANOS',
      titulo: 'Cumpleaños de Paciente',
      mensaje: `${nombrePaciente} cumplirá ${edad} años el ${fechaNacimiento}.`,
      evento_id: evento.id,
      roles_destino: rolesDestino,
    });
  }

  async notificarCumpleanosEmpleado(
    empleadoId: number,
    nombreEmpleado: string,
    fechaNacimiento: string,
    edad: number,
    cargo: string,
    usuarioCreador: number,
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'CUMPLEANOS_EMPLEADO',
      descripcion: `${nombreEmpleado} cumplirá ${edad} años`,
      usuario_id: usuarioCreador,
      datos_adicionales: {
        empleado_id: empleadoId,
        nombre_empleado: nombreEmpleado,
        fecha_nacimiento: fechaNacimiento,
        edad: edad,
        cargo: cargo,
      },
    });

    await this.crearNotificacion({
      tipo_notificacion: 'CUMPLEANOS',
      titulo: 'Cumpleaños de Empleado',
      mensaje: `${nombreEmpleado} cumplirá ${edad} años el ${fechaNacimiento}. Cargo: ${cargo}.`,
      evento_id: evento.id,
      roles_destino: [1],
    });
  }

  async notificarAccesoFueraHorario(
    empleadoId: number,
    nombreEmpleado: string,
    horaIngreso: string,
    ip: string,
    dispositivo: string,
    usuarioCreador: number
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'ACCESO_FUERA_HORARIO',
      descripcion: `${nombreEmpleado} accedió fuera del horario laboral`,
      usuario_id: usuarioCreador,
      ip: ip,
      dispositivo: dispositivo,
      datos_adicionales: {
        empleado_id: empleadoId,
        nombre_empleado: nombreEmpleado,
        hora_ingreso: horaIngreso,
      },
    });

    await this.crearNotificacion({
      tipo_notificacion: 'ACCESO',
      titulo: 'Acceso Fuera de Horario',
      mensaje: `${nombreEmpleado} accedió al sistema el ${new Date().toLocaleDateString('es-ES')} a las ${horaIngreso}. IP: ${ip}`,
      evento_id: evento.id,
      roles_destino: [1],
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
      datos_adicionales: {
        cita_id: citaId,
        paciente_nombre: pacienteNombre,
        fecha_cita: fechaCita,
        hora_cita: horaCita,
        terapeuta_nombre: terapeutaNombre,
        motivo_eliminacion: motivoEliminacion,
      },
    });

    await this.crearNotificacion({
      tipo_notificacion: 'CITA_ELIMINADA',
      titulo: 'Cita Eliminada',
      mensaje: `${nombreUsuarioEliminador} eliminó una cita de ${pacienteNombre} programada para el ${fechaCita} a las ${horaCita} con ${terapeutaNombre}. Motivo: ${motivoEliminacion}`,
      evento_id: evento.id,
      roles_destino: [1],
    });
  }

  async notificarCitaModificada(
    citaId: number,
    usuarioModificadorId: number,
    nombreUsuarioModificador: string,
    pacienteNombre: string,
    fechaAnterior: string,
    horaAnterior: string,
    terapeutaAnterior: string,
    fechaNueva: string,
    horaNueva: string,
    terapeutaNuevo: string,
    motivoModificacion: string,
  ) {
    const evento = await this.crearEvento({
      tipo_evento: 'CITA_MODIFICADA',
      descripcion: `Cita modificada por ${nombreUsuarioModificador}`,
      usuario_id: usuarioModificadorId,
      datos_adicionales: {
        cita_id: citaId,
        paciente_nombre: pacienteNombre,
        fecha_anterior: fechaAnterior,
        hora_anterior: horaAnterior,
        terapeuta_anterior: terapeutaAnterior,
        fecha_nueva: fechaNueva,
        hora_nueva: horaNueva,
        terapeuta_nuevo: terapeutaNuevo,
        motivo_modificacion: motivoModificacion,
      },
    });

    const cambios = [];
    if (fechaAnterior !== fechaNueva || horaAnterior !== horaNueva) {
      cambios.push(`reprogramó de ${fechaAnterior} ${horaAnterior} a ${fechaNueva} ${horaNueva}`);
    }
    if (terapeutaAnterior !== terapeutaNuevo) {
      cambios.push(`cambió terapeuta de ${terapeutaAnterior} a ${terapeutaNuevo}`);
    }

    const mensajeCambios = cambios.length > 0 ? cambios.join(' y ') : 'modificó la cita';

    await this.crearNotificacion({
      tipo_notificacion: 'CITA_MODIFICADA',
      titulo: 'Cita Modificada',
      mensaje: `${nombreUsuarioModificador} ${mensajeCambios} de ${pacienteNombre}. Motivo: ${motivoModificacion}`,
      evento_id: evento.id,
      roles_destino: [1],
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
      datos_adicionales: {
        terapeuta_id: terapeutaId,
        terapeuta_nombre: terapeutaNombre,
        paciente_nombre: pacienteNombre,
        tipo_sesion: tipoSesion,
      },
    });

    await this.crearNotificacion({
      tipo_notificacion: 'NOTA_EVOLUCION',
      titulo: 'Nota de Evolución Registrada',
      mensaje: `${terapeutaNombre} registró una nota de evolución para ${pacienteNombre}. Tipo: ${tipoSesion}.`,
      evento_id: evento.id,
      roles_destino: [1],
    });
  }
}