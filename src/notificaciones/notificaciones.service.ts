import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion, TipoNotificacion } from './notificacion.entity';
import { ConfiguracionNotificacion } from './configuracion-notificacion.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { NotificacionesEventsService } from './notificaciones-events.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private ultimoCalculoDiario: Date | null = null;

  constructor(
    @InjectRepository(Notificacion)
    private notificacionRepo: Repository<Notificacion>,
    @InjectRepository(ConfiguracionNotificacion)
    private configRepo: Repository<ConfiguracionNotificacion>,
    @InjectRepository(Paciente)
    private pacienteRepo: Repository<Paciente>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepo: Repository<TrabajadorCentro>,
    private eventsService: NotificacionesEventsService,
  ) {}

  /**
   * Inicializa las configuraciones de notificaciones si no existen
   */
  async inicializarConfiguraciones(): Promise<{ mensaje: string; configuraciones: any[] }> {
    const configuracionesIniciales = [
      {
        tipo: 'CUMPLEANOS_PACIENTE',
        activa: true,
        descripcion: 'Notifica cumpleaños de pacientes',
        diasAnticipacion: 1,
      },
      {
        tipo: 'ANIVERSARIO_EMPLEADO',
        activa: true,
        descripcion: 'Notifica aniversarios laborales de empleados',
        diasAnticipacion: 1,
      },
      {
        tipo: 'LOGIN_FUERA_HORARIO',
        activa: true,
        descripcion: 'Notifica logins fuera del horario laboral',
        diasAnticipacion: 0,
      },
      {
        tipo: 'CITA_ELIMINADA',
        activa: true,
        descripcion: 'Notifica cuando se elimina una cita',
        diasAnticipacion: 0,
      },
    ];

    const configuracionesCreadas = [];

    for (const config of configuracionesIniciales) {
      // Verificar si ya existe
      const existe = await this.configRepo.findOne({
        where: { tipo: config.tipo },
      });

      if (!existe) {
        const nuevaConfig = await this.configRepo.save(config);
        configuracionesCreadas.push(nuevaConfig);
        this.logger.log(`✅ Configuración creada: ${config.tipo}`);
      } else {
        this.logger.log(`⏭️ Configuración ya existe: ${config.tipo}`);
      }
    }

    return {
      mensaje: `Se inicializaron ${configuracionesCreadas.length} configuraciones`,
      configuraciones: configuracionesCreadas,
    };
  }

  /**
   * Genera notificaciones diarias (cumpleaños y aniversarios)
   * Se llama SOLO en el primer login del día de un admin
   */
  async generarNotificacionesDiarias(): Promise<{ ejecutado: boolean; mensaje: string }> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Verificar si ya se calculó hoy
    if (this.ultimoCalculoDiario) {
      const ultimaFecha = new Date(this.ultimoCalculoDiario);
      ultimaFecha.setHours(0, 0, 0, 0);

      if (ultimaFecha.getTime() === hoy.getTime()) {
        this.logger.log('⏭️ Las notificaciones diarias ya fueron generadas hoy');
        return { ejecutado: false, mensaje: 'Ya se generaron hoy' };
      }
    }

    this.logger.log('⏰ Iniciando generación de notificaciones diarias...');

    try {
      await this.generarNotificacionesCumpleanos();
      await this.generarNotificacionesAniversario();

      this.ultimoCalculoDiario = new Date();
      this.logger.log('✅ Notificaciones diarias generadas exitosamente');

      return { ejecutado: true, mensaje: 'Notificaciones generadas' };
    } catch (error) {
      this.logger.error('❌ Error al generar notificaciones diarias:', error);
      throw error;
    }
  }

  /**
   * Genera notificaciones de cumpleaños de pacientes
   */
  private async generarNotificacionesCumpleanos(): Promise<void> {
    try {
      const config = await this.configRepo.findOne({
        where: { tipo: 'CUMPLEANOS_PACIENTE', activa: true },
      });

      if (!config) {
        this.logger.warn('⚠️ Configuración de CUMPLEANOS_PACIENTE no encontrada o inactiva. Ejecuta /notificaciones/inicializar-configuraciones');
        return;
      }

      const hoy = new Date();
      const fechaObjetivo = new Date(hoy);
      // TEMPORAL PARA TESTING: Buscar en los próximos 30 días
      // CAMBIAR A: fechaObjetivo.setDate(fechaObjetivo.getDate() + config.diasAnticipacion);
      fechaObjetivo.setDate(fechaObjetivo.getDate() + 30);

      // Usar UTC para evitar problemas de timezone
      const diaObjetivo = fechaObjetivo.getUTCDate();
      const mesObjetivo = fechaObjetivo.getUTCMonth() + 1;

      const pacientes = await this.pacienteRepo
        .createQueryBuilder('p')
        .where(
          'DAY(p.fecha_nacimiento) = :dia AND MONTH(p.fecha_nacimiento) = :mes',
          { dia: diaObjetivo, mes: mesObjetivo },
        )
        .andWhere('p.activo = :activo', { activo: true })
        .getMany();

      const admins = await this.obtenerAdministradores();

      if (admins.length === 0) {
        this.logger.warn('No hay administradores para notificar cumpleaños');
        return;
      }

      let notificacionesGeneradas = 0;

      for (const paciente of pacientes) {
        // Evitar duplicados: verificar si ya existe notificación en las últimas 24h
        const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const notifExistente = await this.notificacionRepo
          .createQueryBuilder('n')
          .where('n.tipo = :tipo', { tipo: TipoNotificacion.CUMPLEANOS_PACIENTE })
          .andWhere('n.pacienteId = :pacienteId', { pacienteId: paciente.id })
          .andWhere('n.fechaCreacion >= :hace24Horas', { hace24Horas })
          .getOne();

        if (notifExistente) {
          this.logger.log(`⏭️ Ya existe notificación de cumpleaños para ${paciente.nombres}`);
          continue;
        }

        const edad = fechaObjetivo.getFullYear() - new Date(paciente.fecha_nacimiento).getFullYear();

        await this.crearYNotificar({
          tipo: TipoNotificacion.CUMPLEANOS_PACIENTE,
          usuarioId: admins[0].id,
          pacienteId: paciente.id,
          titulo: '🎂 Cumpleaños de paciente',
          mensaje: `${paciente.nombres} ${paciente.apellido_paterno} cumplirá ${edad} años ${config.diasAnticipacion === 0 ? 'hoy' : config.diasAnticipacion === 1 ? 'mañana' : `en ${config.diasAnticipacion} días`}`,
          datosAdicionales: {
            fecha_nacimiento: paciente.fecha_nacimiento,
            edad: edad,
          },
        });

        notificacionesGeneradas++;
      }

      this.logger.log(`✨ Notificaciones de cumpleaños generadas: ${notificacionesGeneradas}`);
    } catch (error) {
      this.logger.error('Error al generar notificaciones de cumpleaños:', error);
    }
  }

  /**
   * Genera notificaciones de aniversarios laborales
   */
  private async generarNotificacionesAniversario(): Promise<void> {
    try {
      const config = await this.configRepo.findOne({
        where: { tipo: 'ANIVERSARIO_EMPLEADO', activa: true },
      });

      if (!config) {
        this.logger.warn('⚠️ Configuración de ANIVERSARIO_EMPLEADO no encontrada o inactiva. Ejecuta /notificaciones/inicializar-configuraciones');
        return;
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const empleados = await this.trabajadorRepo
        .createQueryBuilder('t')
        .where('t.fecha_ingreso IS NOT NULL')
        .andWhere('t.estado = :estado', { estado: true })
        .getMany();

      const admins = await this.obtenerAdministradores();

      if (admins.length === 0) {
        this.logger.warn('No hay administradores para notificar aniversarios');
        return;
      }

      let notificacionesGeneradas = 0;

      for (const empleado of empleados) {
        // Usar UTC para evitar problemas de timezone
        const fechaIngreso = new Date(empleado.fecha_ingreso);
        const diaIngreso = fechaIngreso.getUTCDate();
        const mesIngreso = fechaIngreso.getUTCMonth();
        const anoIngreso = fechaIngreso.getUTCFullYear();

        this.logger.debug(`📅 Procesando empleado: ${empleado.nombres}`);
        this.logger.debug(`   Fecha ingreso BD: ${empleado.fecha_ingreso}`);
        this.logger.debug(`   Fecha ingreso UTC: ${anoIngreso}-${mesIngreso + 1}-${diaIngreso}`);

        // Calcular próximo aniversario
        let proximoAniversario = new Date(
          hoy.getFullYear(),
          mesIngreso,
          diaIngreso,
        );
        proximoAniversario.setHours(0, 0, 0, 0);

        // Si el aniversario de este año ya pasó, usar el del próximo año
        if (proximoAniversario < hoy) {
          proximoAniversario.setFullYear(hoy.getFullYear() + 1);
        }

        // Calcular días hasta el aniversario
        const diasHasta = Math.ceil(
          (proximoAniversario.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Calcular años de servicio
        const anosServicio = proximoAniversario.getFullYear() - anoIngreso;

        this.logger.debug(`   Próximo aniversario: ${proximoAniversario.toLocaleDateString('es-PE')}`);
        this.logger.debug(`   Días hasta aniversario: ${diasHasta}`);
        this.logger.debug(`   Años de servicio: ${anosServicio}`);

        // Verificar si está dentro del rango de anticipación
        // TEMPORAL PARA TESTING: Buscar en los próximos 30 días
        // CAMBIAR A: if (diasHasta >= 0 && diasHasta <= config.diasAnticipacion) {
        if (diasHasta >= 0 && diasHasta <= 30) {
          // Evitar duplicados
          const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const notifExistente = await this.notificacionRepo
            .createQueryBuilder('n')
            .where('n.tipo = :tipo', { tipo: TipoNotificacion.ANIVERSARIO_EMPLEADO })
            .andWhere('n.empleadoId = :empleadoId', { empleadoId: empleado.id })
            .andWhere('n.fechaCreacion >= :hace24Horas', { hace24Horas })
            .getOne();

          if (notifExistente) {
            this.logger.log(`⏭️ Ya existe notificación de aniversario para ${empleado.nombres}`);
            continue;
          }

          const fechaFormateada = proximoAniversario.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });

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
        }
      }

      this.logger.log(`✨ Notificaciones de aniversario generadas: ${notificacionesGeneradas}`);
    } catch (error) {
      this.logger.error('Error al generar notificaciones de aniversario:', error);
    }
  }

  /**
   * Notifica login fuera de horario laboral
   */
  async notificarLoginFueraHorario(
    usuarioId: number,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    const config = await this.configRepo.findOne({
      where: { tipo: 'LOGIN_FUERA_HORARIO', activa: true },
    });

    if (!config) return;

    const ahora = new Date();
    const dia = ahora.getDay();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const horaDecimal = hora + minutos / 60;

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

    if (!fueraHorario) return;

    const usuario = await this.trabajadorRepo.findOne({
      where: { id: usuarioId },
      relations: ['rol'],
    });

    const admins = await this.obtenerAdministradores();

    // Filtrar para no notificarse a sí mismo
    const adminsToNotify = admins.filter((admin) => admin.id !== usuarioId);

    if (adminsToNotify.length > 0) {
      await this.crearYNotificar({
        tipo: TipoNotificacion.LOGIN_FUERA_HORARIO,
        usuarioId: adminsToNotify[0].id,
        empleadoId: usuarioId,
        titulo: '⚠️ Login fuera de horario',
        mensaje: `${usuario.nombres} ${usuario.apellidos} ingresó al sistema fuera del horario laboral`,
        datosAdicionales: {
          fecha_hora: ahora,
          ip: ip,
          userAgent: userAgent,
        },
      });
    }
  }

  /**
   * Notifica cuando se elimina una cita
   */
  async notificarCitaEliminada(
    citaId: number,
    citaData: any,
    usuarioId: number,
  ): Promise<void> {
    const config = await this.configRepo.findOne({
      where: { tipo: 'CITA_ELIMINADA', activa: true },
    });

    if (!config) return;

    const usuario = await this.trabajadorRepo.findOne({ where: { id: usuarioId } });
    const admins = await this.obtenerAdministradores();

    // Formatear fecha sin timezone issues
    let fechaFormateada: string;
    try {
      let fechaStr = String(citaData.fecha);

      if (fechaStr.includes('T')) {
        fechaStr = fechaStr.split('T')[0];
      } else if (fechaStr.includes(' ')) {
        fechaStr = fechaStr.split(' ')[0];
      }

      const partes = fechaStr.split('-');
      if (partes.length === 3) {
        const [year, month, day] = partes;
        fechaFormateada = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      } else {
        throw new Error('Formato de fecha no reconocido');
      }
    } catch (error) {
      this.logger.error(`Error al formatear fecha: ${error.message}`);
      fechaFormateada = String(citaData.fecha);
    }

    if (admins.length > 0) {
      await this.crearYNotificar({
        tipo: TipoNotificacion.CITA_ELIMINADA,
        usuarioId: admins[0].id,
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

  /**
   * Obtiene notificaciones del usuario
   */
  async obtenerNotificaciones(
    usuarioId: number,
    leida?: boolean,
    limite = 15,
  ): Promise<Notificacion[]> {
    const where: any = { usuarioId };
    if (leida !== undefined) where.leida = leida;

    return this.notificacionRepo.find({
      where,
      order: { fechaCreacion: 'DESC' },
      take: limite,
    });
  }

  /**
   * Cuenta notificaciones no leídas
   */
  async contarNoLeidas(usuarioId: number): Promise<number> {
    return this.notificacionRepo.count({
      where: { usuarioId, leida: false },
    });
  }

  /**
   * Marca una notificación como leída
   */
  async marcarComoLeida(id: number): Promise<Notificacion> {
    const notificacion = await this.notificacionRepo.findOne({ where: { id } });

    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }

    notificacion.leida = true;
    notificacion.fechaLeida = new Date();

    return this.notificacionRepo.save(notificacion);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async marcarTodasLeidas(usuarioId: number): Promise<{ affected: number }> {
    const notificacionesNoLeidas = await this.notificacionRepo.find({
      where: { usuarioId, leida: false },
    });

    if (notificacionesNoLeidas.length === 0) {
      return { affected: 0 };
    }

    const fechaLeida = new Date();

    for (const notif of notificacionesNoLeidas) {
      notif.leida = true;
      notif.fechaLeida = fechaLeida;
      await this.notificacionRepo.save(notif);
    }

    return { affected: notificacionesNoLeidas.length };
  }

  /**
   * Obtiene todos los administradores activos
   */
  private async obtenerAdministradores(): Promise<TrabajadorCentro[]> {
    return this.trabajadorRepo.find({
      where: { rol: { id: 1 }, estado: true },
      relations: ['rol'],
    });
  }

  /**
   * Crea una notificación y emite evento para SSE
   * Usa RxJS Subject en lugar de EventEmitter2 (100% nativo de NestJS)
   */
  private async crearYNotificar(notificacionData: Partial<Notificacion>): Promise<Notificacion> {
    const notificacion = await this.notificacionRepo.save(notificacionData);

    // Emitir evento para SSE usando RxJS Subject
    this.eventsService.emitirNotificacionNueva(
      notificacionData.usuarioId,
      notificacion,
    );

    this.logger.log(`✨ Notificación creada para usuario ${notificacionData.usuarioId}`);

    return notificacion;
  }
}
