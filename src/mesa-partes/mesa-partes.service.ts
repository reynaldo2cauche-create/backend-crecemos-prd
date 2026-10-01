import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MesaPartesSolicitud } from './entities/solicitud.entity';
import { MesaPartesEvento } from './entities/evento.entity';
import { MesaPartesAdjunto } from './entities/adjunto.entity';
import { MesaPartesEstado } from './entities/estado.entity';
import { MesaPartesTipoEvento } from './entities/tipo-evento.entity';
import { MesaPartesTipo } from './entities/tipo.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ResponderSolicitudDto } from './dto/responder-solicitud.dto';
import { AccionSolicitudDto } from './dto/accion-solicitud.dto';
import { FiltrarSolicitudesDto } from './dto/filtrar-solicitudes.dto';

@Injectable()
export class MesaPartesService {
  constructor(
    @InjectRepository(MesaPartesSolicitud)
    private solicitudRepo: Repository<MesaPartesSolicitud>,
    @InjectRepository(MesaPartesEvento)
    private eventoRepo: Repository<MesaPartesEvento>,
    @InjectRepository(MesaPartesAdjunto)
    private adjuntoRepo: Repository<MesaPartesAdjunto>,
    @InjectRepository(MesaPartesEstado)
    private estadoRepo: Repository<MesaPartesEstado>,
    @InjectRepository(MesaPartesTipoEvento)
    private tipoEventoRepo: Repository<MesaPartesTipoEvento>,
    @InjectRepository(MesaPartesTipo)
    private tipoRepo: Repository<MesaPartesTipo>,
    @InjectRepository(Paciente)
    private pacienteRepo: Repository<Paciente>,
  ) {}

  // ========================================
  // BUSCAR PACIENTES (sin geofencing — para el formulario de recepción)
  // ========================================
  async buscarPacientes(q: string) {
    if (!q || q.trim().length < 2) return [];
    const palabras = q.trim().split(/\s+/).filter(Boolean);

    const qb = this.pacienteRepo
      .createQueryBuilder('p')
      .select(['p.id', 'p.nombres', 'p.apellido_paterno', 'p.apellido_materno', 'p.numero_documento', 'p.celular']);

    palabras.forEach((palabra, i) => {
      qb.andWhere(
        `(CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) LIKE :w${i} OR p.numero_documento LIKE :w${i})`,
        { [`w${i}`]: `%${palabra}%` },
      );
    });

    const rows = await qb.orderBy('p.nombres', 'ASC').limit(20).getMany();
    return rows.map((r) => ({
      id: r.id,
      nombre_completo: [r.nombres, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(' '),
      numero_documento: r.numero_documento,
      celular: r.celular,
    }));
  }

  // ========================================
  // CATÁLOGOS
  // ========================================
  async obtenerCatalogos() {
    const [estados, tipos, tiposEvento] = await Promise.all([
      this.estadoRepo.find({ where: { activo: 1 }, order: { orden: 'ASC' } }),
      this.tipoRepo.find({ where: { activo: 1 }, order: { nombre: 'ASC' } }),
      this.tipoEventoRepo.find(),
    ]);
    return { estados, tipos, tiposEvento };
  }

  private async getEstadoPorCodigo(codigo: string): Promise<MesaPartesEstado> {
    const estado = await this.estadoRepo.findOne({ where: { codigo } });
    if (!estado) throw new BadRequestException(`Estado "${codigo}" no existe`);
    return estado;
  }

  private async getTipoEventoPorCodigo(codigo: string): Promise<MesaPartesTipoEvento> {
    const tipo = await this.tipoEventoRepo.findOne({ where: { codigo } });
    if (!tipo) throw new BadRequestException(`Tipo de evento "${codigo}" no existe`);
    return tipo;
  }

  // ========================================
  // GENERAR NÚMERO DE EXPEDIENTE  (YYYY-00001, correlativo por año)
  // ========================================
  private async generarNumeroExpediente(): Promise<string> {
    const anio = new Date().getFullYear();
    const count = await this.solicitudRepo
      .createQueryBuilder('s')
      .where('YEAR(s.created_at) = :anio', { anio })
      .getCount();
    const numero = String(count + 1).padStart(5, '0');
    return `${anio}-${numero}`;
  }

  // ========================================
  // REGISTRAR EVENTO EN LA BITÁCORA (append-only)
  // ========================================
  private async registrarEvento(params: {
    solicitudId: number;
    tipoEventoCodigo: string;
    estadoAnteriorId?: number | null;
    estadoNuevoId?: number | null;
    comentario?: string | null;
    usuarioId: number;
  }): Promise<MesaPartesEvento> {
    const tipoEvento = await this.getTipoEventoPorCodigo(params.tipoEventoCodigo);
    const evento = this.eventoRepo.create({
      solicitud_id: params.solicitudId,
      tipo_evento_id: tipoEvento.id,
      estado_anterior_id: params.estadoAnteriorId ?? null,
      estado_nuevo_id: params.estadoNuevoId ?? null,
      comentario: params.comentario ?? null,
      user_crea_id: params.usuarioId,
    });
    return this.eventoRepo.save(evento);
  }

  // ========================================
  // GUARDAR ADJUNTO
  // ========================================
  async guardarAdjunto(params: {
    solicitudId: number;
    eventoId?: number | null;
    nombreArchivo: string;
    ruta: string;
    tipoMime?: string;
    tamano?: number;
    usuarioId: number;
  }): Promise<MesaPartesAdjunto> {
    const adjunto = this.adjuntoRepo.create({
      solicitud_id: params.solicitudId,
      evento_id: params.eventoId ?? null,
      nombre_archivo: params.nombreArchivo,
      ruta: params.ruta,
      tipo_mime: params.tipoMime,
      tamano: params.tamano,
      user_crea_id: params.usuarioId,
    });
    return this.adjuntoRepo.save(adjunto);
  }

  // ========================================
  // CREAR SOLICITUD (RECEPCIÓN)
  // ========================================
  async crearSolicitud(dto: CrearSolicitudDto): Promise<MesaPartesSolicitud> {
    const estadoInicial = await this.getEstadoPorCodigo('RECEPCIONADA');
    const numero = await this.generarNumeroExpediente();

    const solicitud = this.solicitudRepo.create({
      numero_expediente: numero,
      paciente_id: dto.paciente_id ?? null,
      tipo_id: dto.tipo_id,
      asunto: dto.asunto ?? null,
      descripcion: dto.descripcion,
      entregado_por_nombre: dto.entregado_por_nombre,
      entregado_por_doc: dto.entregado_por_doc ?? null,
      entregado_por_telefono: dto.entregado_por_telefono ?? null,
      estado_id: estadoInicial.id,
      user_crea_id: dto.user_crea_id,
    });

    const guardada = await this.solicitudRepo.save(solicitud);

    await this.registrarEvento({
      solicitudId: guardada.id,
      tipoEventoCodigo: 'RECEPCION',
      estadoNuevoId: estadoInicial.id,
      comentario: 'Documento recepcionado',
      usuarioId: dto.user_crea_id,
    });

    return guardada;
  }

  // ========================================
  // LISTAR SOLICITUDES (bandeja)
  // ========================================
  async listar(filtros: FiltrarSolicitudesDto) {
    const { page = 1, limit = 10, estado_id, tipo_id, paciente_id, fecha_desde, fecha_hasta, busqueda } = filtros;

    const query = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.estado', 'estado')
      .leftJoinAndSelect('s.tipo', 'tipo')
      .leftJoinAndSelect('s.paciente', 'paciente')
      .leftJoinAndSelect('s.usuarioCrea', 'usuarioCrea')
      .leftJoinAndSelect('s.responde', 'responde')
      .where('s.activo = 1')
      .orderBy('s.created_at', 'DESC');

    if (estado_id) query.andWhere('s.estado_id = :estado_id', { estado_id });
    if (tipo_id) query.andWhere('s.tipo_id = :tipo_id', { tipo_id });
    if (paciente_id) query.andWhere('s.paciente_id = :paciente_id', { paciente_id });
    if (fecha_desde) query.andWhere('s.created_at >= :fecha_desde', { fecha_desde });
    if (fecha_hasta) query.andWhere('s.created_at <= :fecha_hasta', { fecha_hasta });
    if (busqueda) {
      query.andWhere(
        '(s.numero_expediente LIKE :b OR s.asunto LIKE :b OR s.entregado_por_nombre LIKE :b OR s.entregado_por_doc LIKE :b)',
        { b: `%${busqueda}%` },
      );
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ========================================
  // OBTENER EXPEDIENTE POR ID (con bitácora + adjuntos)
  // ========================================
  async obtenerPorId(id: number): Promise<MesaPartesSolicitud> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id },
      relations: [
        'estado',
        'tipo',
        'paciente',
        'usuarioCrea',
        'responde',
        'eventos',
        'eventos.tipoEvento',
        'eventos.estadoAnterior',
        'eventos.estadoNuevo',
        'eventos.usuarioCrea',
        'adjuntos',
        'adjuntos.usuarioCrea',
      ],
    });

    if (!solicitud) throw new NotFoundException('Expediente no encontrado');

    // Ordenar la bitácora cronológicamente
    if (solicitud.eventos) {
      solicitud.eventos.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }

    return solicitud;
  }

  // ========================================
  // RESPONDER (ADMIN): ATENDIDA o RECHAZADA
  // ========================================
  async responder(id: number, dto: ResponderSolicitudDto): Promise<MesaPartesSolicitud> {
    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Expediente no encontrado');

    const estadoAnteriorId = solicitud.estado_id;
    const codigoDestino = dto.resultado; // 'ATENDIDA' | 'RECHAZADA'
    const estadoNuevo = await this.getEstadoPorCodigo(codigoDestino);

    await this.solicitudRepo.update(id, {
      respuesta: dto.respuesta,
      respondido_por: dto.usuario_id,
      fecha_respuesta: new Date(),
      estado_id: estadoNuevo.id,
      user_actua_id: dto.usuario_id,
    });

    await this.registrarEvento({
      solicitudId: id,
      tipoEventoCodigo: codigoDestino === 'ATENDIDA' ? 'RESPUESTA' : 'RECHAZO',
      estadoAnteriorId,
      estadoNuevoId: estadoNuevo.id,
      comentario: dto.respuesta,
      usuarioId: dto.usuario_id,
    });

    return this.obtenerPorId(id);
  }

  // ========================================
  // OBSERVAR (ADMIN): pide corrección
  // ========================================
  async observar(id: number, dto: AccionSolicitudDto): Promise<MesaPartesSolicitud> {
    if (!dto.comentario || !dto.comentario.trim()) {
      throw new BadRequestException('La observación requiere un comentario');
    }
    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Expediente no encontrado');

    const estadoAnteriorId = solicitud.estado_id;
    const estadoNuevo = await this.getEstadoPorCodigo('OBSERVADA');

    await this.solicitudRepo.update(id, {
      estado_id: estadoNuevo.id,
      user_actua_id: dto.usuario_id,
    });

    await this.registrarEvento({
      solicitudId: id,
      tipoEventoCodigo: 'OBSERVACION',
      estadoAnteriorId,
      estadoNuevoId: estadoNuevo.id,
      comentario: dto.comentario,
      usuarioId: dto.usuario_id,
    });

    return this.obtenerPorId(id);
  }

  // ========================================
  // NOTIFICAR (RECEPCIÓN): avisó al apoderado
  //  - Si venía RECHAZADA: se informa y se CIERRA directo (no hay entrega;
  //    si el apoderado quiere, debe generar una solicitud nueva).
  //  - Si venía ATENDIDA: pasa a NOTIFICADA y luego se entrega.
  // ========================================
  async notificar(id: number, dto: AccionSolicitudDto): Promise<MesaPartesSolicitud> {
    const solicitud = await this.solicitudRepo.findOne({ where: { id }, relations: ['estado'] });
    if (!solicitud) throw new NotFoundException('Expediente no encontrado');

    const estadoAnteriorId = solicitud.estado_id;
    const eraRechazo = solicitud.estado?.codigo === 'RECHAZADA';
    const estadoNuevo = await this.getEstadoPorCodigo(eraRechazo ? 'CERRADA' : 'NOTIFICADA');

    await this.solicitudRepo.update(id, {
      estado_id: estadoNuevo.id,
      user_actua_id: dto.usuario_id,
    });

    await this.registrarEvento({
      solicitudId: id,
      tipoEventoCodigo: 'NOTIFICACION',
      estadoAnteriorId,
      estadoNuevoId: estadoNuevo.id,
      comentario:
        dto.comentario ||
        (eraRechazo ? 'Apoderado informado del rechazo. Expediente cerrado.' : 'Apoderado notificado'),
      usuarioId: dto.usuario_id,
    });

    return this.obtenerPorId(id);
  }

  // ========================================
  // ENTREGAR / CERRAR (RECEPCIÓN)
  // ========================================
  async entregar(id: number, dto: AccionSolicitudDto): Promise<MesaPartesSolicitud> {
    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Expediente no encontrado');

    const estadoAnteriorId = solicitud.estado_id;
    const estadoNuevo = await this.getEstadoPorCodigo('CERRADA');

    await this.solicitudRepo.update(id, {
      estado_id: estadoNuevo.id,
      user_actua_id: dto.usuario_id,
    });

    await this.registrarEvento({
      solicitudId: id,
      tipoEventoCodigo: 'ENTREGA',
      estadoAnteriorId,
      estadoNuevoId: estadoNuevo.id,
      comentario: dto.comentario || 'Respuesta entregada al apoderado',
      usuarioId: dto.usuario_id,
    });

    return this.obtenerPorId(id);
  }

  // ========================================
  // AGREGAR COMENTARIO INTERNO (no cambia estado)
  // ========================================
  async comentar(id: number, dto: AccionSolicitudDto): Promise<MesaPartesSolicitud> {
    if (!dto.comentario || !dto.comentario.trim()) {
      throw new BadRequestException('El comentario no puede estar vacío');
    }
    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Expediente no encontrado');

    await this.registrarEvento({
      solicitudId: id,
      tipoEventoCodigo: 'COMENTARIO',
      comentario: dto.comentario,
      usuarioId: dto.usuario_id,
    });

    return this.obtenerPorId(id);
  }

  // ========================================
  // ESTADÍSTICAS (bandeja / dashboard)
  // ========================================
  async obtenerEstadisticas() {
    const total = await this.solicitudRepo.count({ where: { activo: 1 } });
    const porEstado = await this.solicitudRepo
      .createQueryBuilder('s')
      .select('estado.nombre', 'estado')
      .addSelect('COUNT(s.id)', 'cantidad')
      .leftJoin('s.estado', 'estado')
      .where('s.activo = 1')
      .groupBy('estado.id')
      .getRawMany();
    return { total, porEstado };
  }
}
