import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Solicitud } from './solicitud.entity';
import { SolicitudHistorial } from './solicitud-historial.entity';
import { Falta } from './falta.entity';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { RevisarSolicitudDto } from './dto/revisar-solicitud.dto';

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
  ) {}

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

    return this.findOne(guardada.id);
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
    await this.solicitudRepo.remove(solicitud);
  }
}
