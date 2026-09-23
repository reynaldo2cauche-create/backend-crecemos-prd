import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Solicitud } from './solicitud.entity';
import { SolicitudHistorial } from './solicitud-historial.entity';
import { Falta } from './falta.entity';
import { BloqueoHorarios } from '../bloqueos/entities/bloqueo-horarios.entity';
import { TipoBloqueo } from '../catalogos/tipo-bloqueo.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { RevisarSolicitudDto } from './dto/revisar-solicitud.dto';
import { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { MailService } from '../mail/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

// Código del tipo de bloqueo usado para los permisos (se resuelve el id real por código,
// no se asume 1, porque en cada BD el id puede ser distinto).
const CODIGO_BLOQUEO_PUNTUAL = 'PUNTUAL';

// Anticipación mínima (en días) para solicitar cada tipo, según el Word.
const ANTICIPACION_MINIMA: Record<string, number> = {
  permiso_medico: 0, // desde el mismo día en adelante
  otro: 0, // desde el mismo día
  permiso_horas: 0,
  permiso_capacitacion: 30, // avisar con un mes
  permiso_personal: 60, // avisar con dos meses
  vacaciones: 90, // tres meses
};

// Etiquetas legibles por tipo (para mensajes/errores).
const LABEL_TIPO: Record<string, string> = {
  permiso_personal: 'Permiso personal',
  permiso_medico: 'Permiso médico',
  permiso_capacitacion: 'Permiso por capacitación',
  permiso_horas: 'Permiso por horas',
  vacaciones: 'Vacaciones',
  otro: 'Otro',
};

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private solicitudRepo: Repository<Solicitud>,
    @InjectRepository(SolicitudHistorial)
    private historialRepo: Repository<SolicitudHistorial>,
    @InjectRepository(Falta)
    private faltasRepo: Repository<Falta>,
    @InjectRepository(BloqueoHorarios)
    private bloqueoRepo: Repository<BloqueoHorarios>,
    @InjectRepository(TipoBloqueo)
    private tipoBloqueoRepo: Repository<TipoBloqueo>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepo: Repository<TrabajadorCentro>,
    private readonly notificacionesService: NotificacionesService,
    private readonly mailService: MailService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /** Enumera todas las fechas 'YYYY-MM-DD' entre inicio y fin (ambas inclusive). */
  private enumerarDias(fechaInicio: string, fechaFin: string): string[] {
    const dias: string[] = [];
    const [ai, mi, di] = fechaInicio.split('-').map(Number);
    const [af, mf, df] = fechaFin.split('-').map(Number);
    // Se opera todo en UTC para que el día NO se corra según la zona horaria del server.
    const cursor = Date.UTC(ai, mi - 1, di);
    const fin = Date.UTC(af, mf - 1, df);
    for (let t = cursor; t <= fin; t += 24 * 60 * 60 * 1000) {
      dias.push(new Date(t).toISOString().split('T')[0]);
    }
    return dias;
  }

  /**
   * Crea un bloqueo de agenda por cada día del permiso/vacaciones aprobado, para que
   * el terapeuta no pueda recibir citas en esas fechas/horas. Se crea un bloqueo PUNTUAL
   * por día (así lo detecta la verificación exacta por fecha de `/bloqueos/verificar`).
   */
  private async bloquearAgendaPorSolicitud(
    solicitud: Solicitud,
    revisorId?: number,
  ): Promise<void> {
    const trabajadorId = solicitud.trabajador?.id;
    if (!trabajadorId) return;

    const inicio = solicitud.fecha_inicio;
    const fin = solicitud.fecha_fin || solicitud.fecha_inicio;
    const dias = this.enumerarDias(inicio, fin);
    if (dias.length === 0) return;

    // Resolver el id real del tipo PUNTUAL por su código (varía entre BDs).
    const tipoPuntual = await this.tipoBloqueoRepo.findOne({
      where: { codigo: CODIGO_BLOQUEO_PUNTUAL },
    });
    const tipoBloqueoId = tipoPuntual?.id ?? 1;

    // Si el permiso indica un rango de horas, se bloquea solo ese tramo; si no, todo el día.
    const tieneHoras = !!(solicitud.hora_desde && solicitud.hora_hasta);
    const etiqueta = LABEL_TIPO[solicitud.tipo] || solicitud.tipo;
    const motivo =
      `${etiqueta} aprobado` +
      (solicitud.motivo ? ` — ${solicitud.motivo}` : '') +
      ` (solicitud #${solicitud.id})`;

    const bloqueos = dias.map((dia) =>
      this.bloqueoRepo.create({
        trabajadorId,
        tipoBloqueoId,
        fechaInicio: dia,
        fechaFin: dia,
        diaSemana: null,
        todoElDia: !tieneHoras,
        horaInicio: tieneHoras ? solicitud.hora_desde : null,
        horaFin: tieneHoras ? solicitud.hora_hasta : null,
        motivo: motivo.slice(0, 1000),
        userIdCrea: revisorId ?? null,
        solicitudId: solicitud.id,
      }),
    );

    await this.bloqueoRepo.save(bloqueos);
  }

  /** Diferencia en días de calendario entre hoy (00:00) y una fecha YYYY-MM-DD. */
  private diasDeAnticipacion(fechaInicio: string): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    return Math.round((inicio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  async crear(dto: CrearSolicitudDto): Promise<Solicitud> {
    const anticipacion = this.diasDeAnticipacion(dto.fechaInicio);
    const minima = ANTICIPACION_MINIMA[dto.tipo] ?? 0;

    // Vacaciones: la anticipación de 3 meses es solo recomendada (aviso), NO bloquea.
    // El resto de tipos sí exige la anticipación mínima.
    if (dto.tipo !== 'vacaciones' && anticipacion < minima) {
      throw new BadRequestException(
        `${LABEL_TIPO[dto.tipo] || dto.tipo} requiere solicitarse con al menos ${minima} días de anticipación.`,
      );
    }

    // Motivo/adjunto obligatorios según reglas del Word.
    const motivoObligatorio = ['permiso_medico', 'permiso_capacitacion', 'permiso_personal', 'otro'];
    const adjuntoObligatorio = ['permiso_capacitacion', 'otro'];
    if (motivoObligatorio.includes(dto.tipo) && !dto.motivo?.trim()) {
      throw new BadRequestException(`${LABEL_TIPO[dto.tipo]} requiere un motivo.`);
    }
    if (adjuntoObligatorio.includes(dto.tipo) && !dto.archivoUrl?.trim()) {
      throw new BadRequestException(`${LABEL_TIPO[dto.tipo]} requiere adjuntar un documento.`);
    }

    const solicitud = this.solicitudRepo.create({
      trabajador: { id: dto.trabajadorId } as any,
      tipo: dto.tipo,
      fecha_inicio: dto.fechaInicio,
      fecha_fin: dto.fechaFin ?? null,
      hora_desde: dto.horaDesde ?? null,
      hora_hasta: dto.horaHasta ?? null,
      motivo: dto.motivo ?? null,
      archivo_url: dto.archivoUrl ?? null,
      comentario_colaborador: dto.comentarioColaborador ?? null,
      estado: 'pendiente',
      anticipacion_dias: anticipacion,
    });
    const guardada = await this.solicitudRepo.save(solicitud);

    await this.historialRepo.save(
      this.historialRepo.create({
        solicitud: { id: guardada.id } as any,
        accion: 'creada',
        estado: 'pendiente',
        comentario: 'Solicitud enviada por el colaborador.',
        user_id: dto.trabajadorId,
      }),
    );

    // 🔔 Avisar a Administración / RR.HH. que hay una solicitud por aprobar:
    // notificación in-app + correo a info@/rrhh@ + registro en auditoría.
    // Nada de esto debe romper el registro de la solicitud (todo en background).
    this.notificarNuevaSolicitud(guardada).catch((e) =>
      console.error(`No se pudo notificar la solicitud #${guardada.id}:`, e?.message || e),
    );

    return this.findOne(guardada.id);
  }

  /** Dispara notificación in-app, correo (info@/rrhh@) y auditoría para una solicitud nueva. */
  private async notificarNuevaSolicitud(solicitud: Solicitud): Promise<void> {
    const trabajadorId = solicitud.trabajador?.id as number;
    const trabajador = trabajadorId
      ? await this.trabajadorRepo.findOne({ where: { id: trabajadorId } })
      : null;
    const nombre = trabajador
      ? `${trabajador.nombres} ${trabajador.apellidos}`.trim()
      : `Colaborador #${trabajadorId ?? '?'}`;

    const tipoLabel = LABEL_TIPO[solicitud.tipo] || solicitud.tipo;
    const rango =
      solicitud.fecha_fin && solicitud.fecha_fin !== solicitud.fecha_inicio
        ? `${solicitud.fecha_inicio} al ${solicitud.fecha_fin}`
        : solicitud.fecha_inicio;

    // Notificación in-app (Administración + RR.HH.)
    await this.notificacionesService
      .notificarNuevaSolicitudPermiso(solicitud.id, trabajadorId, nombre, tipoLabel, rango, solicitud.motivo || undefined)
      .catch((e) => console.error('Notificación in-app falló:', e?.message || e));

    // Correo a info@ y rrhh@
    await this.mailService
      .enviarCorreoNuevaSolicitudPermiso({
        solicitudId: solicitud.id,
        trabajadorNombre: nombre,
        tipoLabel,
        fechaInicio: solicitud.fecha_inicio,
        fechaFin: solicitud.fecha_fin,
        horaDesde: solicitud.hora_desde,
        horaHasta: solicitud.hora_hasta,
        motivo: solicitud.motivo,
      })
      .catch((e) => console.error('Correo de solicitud falló:', e?.message || e));

    // Auditoría
    await this.auditoriaService.registrar({
      trabajadorId: trabajadorId,
      accion: 'CREAR_SOLICITUD',
      modulo: 'RRHH',
      descripcion: `${nombre} registró una solicitud de ${tipoLabel} (${rango}) — pendiente de aprobación (solicitud #${solicitud.id})`,
      datosNuevos: {
        solicitud_id: solicitud.id,
        tipo: solicitud.tipo,
        fecha_inicio: solicitud.fecha_inicio,
        fecha_fin: solicitud.fecha_fin,
        motivo: solicitud.motivo,
      },
    });
  }

  /** Solicitudes de un trabajador (autoservicio). */
  async findByTrabajador(trabajadorId: number, estado?: string): Promise<Solicitud[]> {
    const where: any = { trabajador: { id: trabajadorId } };
    if (estado) where.estado = estado;
    return this.solicitudRepo.find({ where, order: { fecha_solicitud: 'DESC' } });
  }

  /** Todas las solicitudes (panel admin), con filtro opcional por estado. */
  async findAll(estado?: string): Promise<Solicitud[]> {
    const where: any = {};
    if (estado) where.estado = estado;
    return this.solicitudRepo.find({ where, order: { fecha_solicitud: 'DESC' } });
  }

  async findOne(id: number): Promise<Solicitud> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id },
      relations: ['historial'],
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    return solicitud;
  }

  /** Aprobar o rechazar. NO genera descuento: eso es manual en la página de Faltas. */
  async revisar(id: number, dto: RevisarSolicitudDto): Promise<Solicitud> {
    const solicitud = await this.findOne(id);
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestException(`La solicitud ya fue ${solicitud.estado}.`);
    }

    solicitud.estado = dto.estado;
    solicitud.comentario_rrhh = dto.comentarioRrhh ?? null;
    solicitud.revisor = dto.revisorId ? ({ id: dto.revisorId } as any) : null;
    solicitud.fecha_revision = new Date();
    await this.solicitudRepo.save(solicitud);

    await this.historialRepo.save(
      this.historialRepo.create({
        solicitud: { id } as any,
        accion: dto.estado === 'aprobado' ? 'aprobada' : 'rechazada',
        estado: dto.estado,
        comentario: dto.comentarioRrhh ?? null,
        user_id: dto.revisorId ?? null,
      }),
    );

    // Al aprobar, bloquear la agenda del terapeuta en las fechas/horas del permiso.
    // Si algo falla al crear el bloqueo, no se revierte la aprobación (solo se registra).
    if (dto.estado === 'aprobado') {
      try {
        await this.bloquearAgendaPorSolicitud(solicitud, dto.revisorId);
      } catch (e) {
        console.error(`No se pudo bloquear la agenda de la solicitud #${id}:`, e);
      }
    }

    return this.findOne(id);
  }

  /**
   * Edición por administración (el colaborador se equivocó). Se permite en cualquier estado.
   * Si la solicitud está aprobada, se rehacen los bloqueos de agenda con las fechas nuevas
   * (se borran los previos por solicitud_id y se recrean), para que no quede bloqueada la
   * fecha vieja. Editar una rechazada solo corrige los datos (no había bloqueos).
   */
  async actualizar(id: number, dto: ActualizarSolicitudDto): Promise<Solicitud> {
    const solicitud = await this.findOne(id);

    if (dto.tipo !== undefined) solicitud.tipo = dto.tipo;
    if (dto.fechaInicio !== undefined) {
      solicitud.fecha_inicio = dto.fechaInicio;
      solicitud.anticipacion_dias = this.diasDeAnticipacion(dto.fechaInicio);
    }
    if (dto.fechaFin !== undefined) solicitud.fecha_fin = dto.fechaFin || null;
    if (dto.horaDesde !== undefined) solicitud.hora_desde = dto.horaDesde || null;
    if (dto.horaHasta !== undefined) solicitud.hora_hasta = dto.horaHasta || null;
    if (dto.motivo !== undefined) solicitud.motivo = dto.motivo ?? null;
    if (dto.comentarioColaborador !== undefined) {
      solicitud.comentario_colaborador = dto.comentarioColaborador ?? null;
    }

    await this.solicitudRepo.save(solicitud);

    // Si ya estaba aprobada, resincronizar el bloqueo de agenda con las fechas nuevas.
    if (solicitud.estado === 'aprobado') {
      try {
        await this.bloqueoRepo.delete({ solicitudId: id });
        await this.bloquearAgendaPorSolicitud(solicitud, dto.userId ?? solicitud.revisor?.id);
      } catch (e) {
        console.error(`No se pudo resincronizar el bloqueo de la solicitud #${id}:`, e);
      }
    }

    await this.historialRepo.save(
      this.historialRepo.create({
        solicitud: { id } as any,
        accion: 'editada',
        estado: solicitud.estado,
        comentario: 'Solicitud editada por administración.',
        user_id: dto.userId ?? null,
      }),
    );

    return this.findOne(id);
  }

  /**
   * Resumen mensual para el perfil (terapeuta o admin).
   * Tardanzas: manual (por ahora 0, se conectará al registro de RRHH).
   */
  async resumen(mes: number, anio: number, trabajadorId?: number) {
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const finMes = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    const wsBase: any = { fecha_inicio: Between(primerDia, finMes) };
    if (trabajadorId) wsBase.trabajador = { id: trabajadorId };

    const aprobadas = await this.solicitudRepo.find({
      where: { ...wsBase, estado: 'aprobado' },
    });

    const permisos = aprobadas.filter((s) => s.tipo.startsWith('permiso_')).length;
    const vacaciones = aprobadas.filter((s) => s.tipo === 'vacaciones').length;

    const faltasWhere: any = {};
    if (trabajadorId) faltasWhere.empleado = { id: trabajadorId };
    faltasWhere.mes = { id: mes };
    faltasWhere.anio = anio;
    const faltas = await this.faltasRepo.count({ where: faltasWhere });

    const pendientesWhere: any = { estado: 'pendiente' };
    if (trabajadorId) pendientesWhere.trabajador = { id: trabajadorId };
    const solicitudesPendientes = await this.solicitudRepo.count({ where: pendientesWhere });

    return {
      mes,
      anio,
      faltas,
      tardanzas: 0, // manual, pendiente de conectar
      permisos,
      vacaciones,
      solicitudesPendientes,
    };
  }

  async remove(id: number): Promise<void> {
    const solicitud = await this.findOne(id);
    // Elimina también los bloqueos de agenda que se hayan generado al aprobar esta solicitud.
    await this.bloqueoRepo.delete({ solicitudId: id });
    await this.solicitudRepo.remove(solicitud);
  }
}
