import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual, Between } from 'typeorm';
import { Notificacion, TipoNotificacion } from './notificacion.entity';
import { ConfiguracionNotificacion } from './configuracion-notificacion.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectRepository(Notificacion)
    private notificacionRepo: Repository<Notificacion>,
    @InjectRepository(ConfiguracionNotificacion)
    private configRepo: Repository<ConfiguracionNotificacion>,
    @InjectRepository(Paciente)
    private pacienteRepo: Repository<Paciente>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepo: Repository<TrabajadorCentro>,
    private eventEmitter: EventEmitter2,
  ) {}

  // Cron job diario a las 8:00 AM
  // TEMPORAL: Ejecutar cada minuto para pruebas (cambiar a '0 8 * * *' en producción)
  @Cron('* * * * *')
  async generarNotificacionesDiarias() {
    this.logger.log('⏰ Iniciando generación de notificaciones diarias...');
    await this.generarNotificacionesCumpleanos();
    await this.generarNotificacionesAniversario();
  }

  async generarNotificacionesCumpleanos() {
    const config = await this.configRepo.findOne({
      where: { tipo: 'CUMPLEANOS_PACIENTE', activa: true },
    });

    if (!config) return;

    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + config.diasAnticipacion);

    const pacientes = await this.pacienteRepo
      .createQueryBuilder('p')
      .where(
        'DAY(p.fecha_nacimiento) = :dia AND MONTH(p.fecha_nacimiento) = :mes',
        { dia: manana.getDate(), mes: manana.getMonth() + 1 },
      )
      .andWhere('p.activo = :activo', { activo: true })
      .getMany();

    const admins = await this.obtenerAdministradores();

    // Crear notificaciones solo si hay admins
    let notificacionesGeneradas = 0;
    if (admins.length > 0) {
      for (const paciente of pacientes) {
        // Evitar duplicados: verificar si ya existe una notificación reciente (últimas 24 horas)
        const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const notifExistente = await this.notificacionRepo
          .createQueryBuilder('n')
          .where('n.tipo = :tipo', { tipo: TipoNotificacion.CUMPLEANOS_PACIENTE })
          .andWhere('n.pacienteId = :pacienteId', { pacienteId: paciente.id })
          .andWhere('n.fechaCreacion >= :hace24Horas', { hace24Horas })
          .getOne();

        if (notifExistente) {
          this.logger.log(`⏭️ Ya existe notificación de cumpleaños reciente para ${paciente.nombres}, omitiendo...`);
          continue;
        }

        const edad = manana.getFullYear() - new Date(paciente.fecha_nacimiento).getFullYear();

        // Crear solo UNA notificación por paciente para el primer admin
        await this.crearYNotificar({
          tipo: TipoNotificacion.CUMPLEANOS_PACIENTE,
          usuarioId: admins[0].id, // Solo el primer admin recibe la notificación
          pacienteId: paciente.id,
          titulo: '🎂 Cumpleaños de paciente',
          mensaje: `${paciente.nombres} ${paciente.apellido_paterno} cumplirá ${edad} años mañana`,
          datosAdicionales: {
            fecha_nacimiento: paciente.fecha_nacimiento,
            edad: edad,
          },
        });
        notificacionesGeneradas++;
      }
    }

    this.logger.log(`✨ Notificaciones de cumpleaños generadas: ${notificacionesGeneradas}`);
  }

  async generarNotificacionesAniversario() {
    const config = await this.configRepo.findOne({
      where: { tipo: 'ANIVERSARIO_EMPLEADO', activa: true },
    });

    if (!config) {
      this.logger.warn('⚠️ Configuración de ANIVERSARIO_EMPLEADO no encontrada o inactiva');
      return;
    }

    this.logger.log(`🔍 Buscando aniversarios con ${config.diasAnticipacion} días de anticipación`);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar a medianoche

    const empleados = await this.trabajadorRepo
      .createQueryBuilder('t')
      .where('t.fecha_ingreso IS NOT NULL')
      .andWhere('t.estado = :estado', { estado: true })
      .getMany();

    this.logger.log(`📋 Total empleados activos con fecha de ingreso: ${empleados.length}`);

    const admins = await this.obtenerAdministradores();

    if (admins.length === 0) {
      this.logger.warn('⚠️ No hay administradores para notificar');
      return;
    }

    let notificacionesGeneradas = 0;

    for (const empleado of empleados) {
      const fechaIngreso = new Date(empleado.fecha_ingreso);
      fechaIngreso.setHours(0, 0, 0, 0);

      this.logger.log(`👤 Verificando empleado: ${empleado.nombres} ${empleado.apellidos}, ingresó: ${fechaIngreso.toISOString()}`);

      // Calcular próximo aniversario (puede ser este año o el próximo)
      let proximoAniversario = new Date(hoy.getFullYear(), fechaIngreso.getMonth(), fechaIngreso.getDate());

      // Si el aniversario de este año ya pasó, usar el del próximo año
      if (proximoAniversario < hoy) {
        proximoAniversario.setFullYear(hoy.getFullYear() + 1);
        this.logger.log(`   ⏭️ Aniversario de este año ya pasó, usando próximo año: ${proximoAniversario.toISOString()}`);
      }

      // Calcular días hasta el aniversario
      const diasHasta = Math.ceil((proximoAniversario.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      // Calcular años de servicio
      const anosServicio = proximoAniversario.getFullYear() - fechaIngreso.getFullYear();

      this.logger.log(`   📅 Próximo aniversario: ${proximoAniversario.toLocaleDateString('es-PE')} (en ${diasHasta} días, ${anosServicio} años)`);

      // Verificar si está dentro del rango de anticipación
      if (diasHasta >= 0 && diasHasta <= config.diasAnticipacion) {
        this.logger.log(`   ✅ ¡Está dentro del rango! Generando notificación...`);

        const fechaFormateada = proximoAniversario.toLocaleDateString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        // Evitar duplicados: verificar si ya existe una notificación reciente (últimas 24 horas)
        const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const notifExistente = await this.notificacionRepo
          .createQueryBuilder('n')
          .where('n.tipo = :tipo', { tipo: TipoNotificacion.ANIVERSARIO_EMPLEADO })
          .andWhere('n.empleadoId = :empleadoId', { empleadoId: empleado.id })
          .andWhere('n.fechaCreacion >= :hace24Horas', { hace24Horas })
          .getOne();

        if (notifExistente) {
          this.logger.log(`   ⏭️ Ya existe notificación reciente (últimas 24h) para este empleado, omitiendo...`);
          continue;
        }

        await this.crearYNotificar({
          tipo: TipoNotificacion.ANIVERSARIO_EMPLEADO,
          usuarioId: admins[0].id,
          empleadoId: empleado.id,
          titulo: '📅 Aniversario laboral próximo',
          mensaje: `${empleado.nombres} ${empleado.apellidos} cumplirá ${anosServicio} año${anosServicio !== 1 ? 's' : ''} de labores ${diasHasta === 0 ? 'HOY' : diasHasta === 1 ? 'MAÑANA' : `en ${diasHasta} días`} (${fechaFormateada})`,
          datosAdicionales: {
            fecha_ingreso: empleado.fecha_ingreso,
            dias_hasta_aniversario: diasHasta,
            anos_servicio: anosServicio,
          },
        });

        notificacionesGeneradas++;
      } else {
        this.logger.log(`   ⏭️ Fuera de rango (${diasHasta} días)`);
      }
    }

    this.logger.log(`✨ Notificaciones de aniversario generadas: ${notificacionesGeneradas}`);
  }

  async notificarLoginFueraHorario(usuarioId: number, ip: string, userAgent: string) {
    this.logger.log(`Verificando login fuera de horario para usuario ${usuarioId}`);

    const config = await this.configRepo.findOne({
      where: { tipo: 'LOGIN_FUERA_HORARIO', activa: true },
    });

    if (!config) {
      this.logger.warn('Configuración de LOGIN_FUERA_HORARIO no encontrada o inactiva');
      return;
    }

    this.logger.log(`Configuración encontrada: ${JSON.stringify(config)}`);

    const ahora = new Date();
    const dia = ahora.getDay();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const horaDecimal = hora + minutos / 60;

    this.logger.log(`Día: ${dia}, Hora: ${hora}:${minutos} (${horaDecimal})`);

    let fueraHorario = false;

    // Lunes a Viernes: 11am - 8pm
    if (dia >= 1 && dia <= 5) {
      fueraHorario = horaDecimal < 11 || horaDecimal >= 20;
    }
    // Sábado: 8am - 2pm
    else if (dia === 6) {
      fueraHorario = horaDecimal < 8 || horaDecimal >= 14;
    }
    // Domingo: fuera de horario
    else {
      fueraHorario = true;
    }

    this.logger.log(`¿Fuera de horario?: ${fueraHorario}`);

    if (!fueraHorario) return;

    const usuario = await this.trabajadorRepo.findOne({
      where: { id: usuarioId },
      relations: ['rol']
    });

    const admins = await this.obtenerAdministradores();

    this.logger.log(`Total de admins encontrados: ${admins.length}`);

    // Filtrar para no notificarse a sí mismo si el que se loguea es admin
    const adminsToNotify = admins.filter(admin => admin.id !== usuarioId);

    this.logger.log(`Admins a notificar (excluyendo al usuario actual): ${adminsToNotify.length}`);

    // Crear solo UNA notificación para el primer admin (que no sea el mismo usuario)
    if (adminsToNotify.length > 0) {
      await this.crearYNotificar({
        tipo: TipoNotificacion.LOGIN_FUERA_HORARIO,
        usuarioId: adminsToNotify[0].id, // Solo el primer admin recibe la notificación
        empleadoId: usuarioId,
        titulo: '⚠️ Login fuera de horario',
        mensaje: `${usuario.nombres} ${usuario.apellidos} ingresó al sistema fuera del horario laboral`,
        datosAdicionales: {
          fecha_hora: ahora,
          ip: ip,
          userAgent: userAgent,
        },
      });
    } else if (admins.length > 0) {
      // Si todos los admins son el mismo usuario (ej: único admin), crear notificación de todas formas
      await this.crearYNotificar({
        tipo: TipoNotificacion.LOGIN_FUERA_HORARIO,
        usuarioId: admins[0].id,
        empleadoId: usuarioId,
        titulo: '⚠️ Login fuera de horario',
        mensaje: `${usuario.nombres} ${usuario.apellidos} ingresó al sistema fuera del horario laboral`,
        datosAdicionales: {
          fecha_hora: ahora,
          ip: ip,
          userAgent: userAgent,
        },
      });
    } else {
      this.logger.warn('No hay administradores para notificar');
    }
  }

  async notificarCitaEliminada(citaId: number, citaData: any, usuarioId: number) {
    const config = await this.configRepo.findOne({
      where: { tipo: 'CITA_ELIMINADA', activa: true },
    });

    if (!config) return;

    const usuario = await this.trabajadorRepo.findOne({ where: { id: usuarioId } });
    const admins = await this.obtenerAdministradores();

    // Formatear la fecha correctamente SIN usar Date() para evitar problemas de timezone
    let fechaFormateada: string;
    try {
      // Convertir a string y extraer solo la parte de fecha
      let fechaStr = String(citaData.fecha);

      // Manejar diferentes formatos:
      // "2024-11-19T00:00:00.000Z" → "2024-11-19"
      // "2024-11-19 12:30:00" → "2024-11-19"
      // "2024-11-19" → "2024-11-19"
      if (fechaStr.includes('T')) {
        fechaStr = fechaStr.split('T')[0];
      } else if (fechaStr.includes(' ')) {
        fechaStr = fechaStr.split(' ')[0];
      }

      // Extraer componentes YYYY-MM-DD
      const partes = fechaStr.split('-');
      if (partes.length === 3) {
        const [year, month, day] = partes;
        fechaFormateada = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      } else {
        throw new Error('Formato de fecha no reconocido');
      }

      this.logger.log(`Fecha original: ${citaData.fecha} → Fecha formateada: ${fechaFormateada}`);
    } catch (error) {
      this.logger.error(`Error al formatear fecha: ${error.message}`);
      fechaFormateada = String(citaData.fecha);
    }

    // Crear solo UNA notificación para el primer admin
    if (admins.length > 0) {
      await this.crearYNotificar({
        tipo: TipoNotificacion.CITA_ELIMINADA,
        usuarioId: admins[0].id, // Solo el primer admin recibe la notificación
        citaId: citaId,
        titulo: '🗑️ Cita eliminada',
        mensaje: `${usuario.nombres} ${usuario.apellidos} eliminó una cita del ${fechaFormateada}`,
        datosAdicionales: {
          cita: citaData,
          eliminado_por: usuarioId,
          eliminado_por_nombre: `${usuario.nombres} ${usuario.apellidos}`,
        },
      });
    }
  }

  async obtenerNotificaciones(usuarioId: number, leida?: boolean, limite = 15) {
    const where: any = { usuarioId };
    if (leida !== undefined) where.leida = leida;

    return this.notificacionRepo.find({
      where,
      order: { fechaCreacion: 'DESC' },
      take: limite,
    });
  }

  async contarNoLeidas(usuarioId: number) {
    return this.notificacionRepo.count({
      where: { usuarioId, leida: false },
    });
  }

  async marcarComoLeida(id: number) {
    const notificacion = await this.notificacionRepo.findOne({ where: { id } });

    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }

    notificacion.leida = true;
    notificacion.fechaLeida = new Date();

    return this.notificacionRepo.save(notificacion);
  }

  async marcarTodasLeidas(usuarioId: number) {
    const notificacionesNoLeidas = await this.notificacionRepo.find({
      where: { usuarioId, leida: false },
    });

    if (notificacionesNoLeidas.length === 0) {
      return { affected: 0 };
    }

    const fechaLeida = new Date();

    // Actualizar cada notificación individualmente
    for (const notif of notificacionesNoLeidas) {
      notif.leida = true;
      notif.fechaLeida = fechaLeida;
      await this.notificacionRepo.save(notif);
    }

    return { affected: notificacionesNoLeidas.length };
  }

  private async obtenerAdministradores() {
    return this.trabajadorRepo.find({
      where: { rol: { id: 1 }, estado: true },
      relations: ['rol'],
    });
  }

  // Método helper para crear notificación y emitir evento inmediato
  private async crearYNotificar(notificacionData: Partial<Notificacion>) {
    // Guardar notificación en BD
    const notificacion = await this.notificacionRepo.save(notificacionData);

    // Emitir evento inmediato para SSE
    this.eventEmitter.emit('notificacion.nueva', {
      usuarioId: notificacionData.usuarioId,
      notificacion,
    });

    this.logger.log(`✨ Notificación creada y emitida para usuario ${notificacionData.usuarioId}`);

    return notificacion;
  }
}
