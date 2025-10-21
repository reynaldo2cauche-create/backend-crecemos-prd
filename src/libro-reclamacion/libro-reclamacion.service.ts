import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { LibroReclamacion } from './entities/libro-reclamacion.entity';
import { LibroReclamacionSeguimiento } from './entities/libro-reclamacion-seguimiento.entity';
import { LibroReclamacionDocumento } from './entities/libro-reclamacion-documento.entity';
import { CreateLibroReclamacionDto } from './dto/create-libro-reclamacion.dto';
import { UpdateLibroReclamacionDto } from './dto/update-libro-reclamacion.dto';
import { FilterLibroReclamacionDto } from './dto/filter-libro-reclamacion.dto';
import { ResponderReclamoDto } from './dto/responder-reclamo.dto';

@Injectable()
export class LibroReclamacionService {
  constructor(
    @InjectRepository(LibroReclamacion)
    private readonly reclamacionRepo: Repository<LibroReclamacion>,
    @InjectRepository(LibroReclamacionSeguimiento)
    private readonly seguimientoRepo: Repository<LibroReclamacionSeguimiento>,
    @InjectRepository(LibroReclamacionDocumento)
    private readonly documentoRepo: Repository<LibroReclamacionDocumento>,
  ) {}

  // Generar número de reclamo único
  private async generarNumeroReclamo(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.reclamacionRepo.count();
    const numero = String(count + 1).padStart(6, '0');
    return `REC-${year}-${numero}`;
  }

  // Registrar seguimiento
  private async registrarSeguimiento(
    reclamoId: number,
    estadoAnterior: string | null,
    estadoNuevo: string,
    usuarioId?: number,
    observacion?: string,
  ): Promise<void> {
    const seguimiento = this.seguimientoRepo.create({
      reclamo_id: reclamoId,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo,
      usuario_id: usuarioId,
      observacion: observacion,
    });
    await this.seguimientoRepo.save(seguimiento);
  }

  // ====== CLIENTE ======
  
  // Crear nuevo reclamo (Cliente)
  async create(createDto: CreateLibroReclamacionDto): Promise<LibroReclamacion> {
    if (!createDto.aceptaTerminos || !createDto.autorizaProcesamiento) {
      throw new BadRequestException('Debe aceptar los términos y autorizar el procesamiento de datos');
    }

    const numeroReclamo = await this.generarNumeroReclamo();

    const reclamo = this.reclamacionRepo.create({
      numero_reclamo: numeroReclamo,
      tipo_documento: createDto.tipoDocumento,
      numero_documento: createDto.numeroDocumento,
      nombres: createDto.nombres,
      apellidos: createDto.apellidos,
      domicilio: createDto.domicilio,
      departamento: createDto.departamento,
      provincia: createDto.provincia,
      distrito: createDto.distrito,
      telefono: createDto.telefono,
      email: createDto.email,
      bien_contratado: createDto.bienContratado,
      monto_reclamo: createDto.montoReclamo,
      detalle_bien: createDto.detalleBien,
      tipo_reclamo: createDto.tipoReclamo,
      fecha_hecho: createDto.fechaHecho,
      lugar_hecho: createDto.lugarHecho,
      detalle_reclamo: createDto.detalleReclamo,
      pedido_consumidor: createDto.pedidoConsumidor,
      acepta_terminos: createDto.aceptaTerminos ? 1 : 0,
      autoriza_procesamiento: createDto.autorizaProcesamiento ? 1 : 0,
      estado: 'RECIBIDO',
    });

    const reclamoGuardado = await this.reclamacionRepo.save(reclamo);

    // Registrar seguimiento inicial
    await this.registrarSeguimiento(reclamoGuardado.id, null, 'RECIBIDO');

    return reclamoGuardado;
  }

  // Consultar reclamo por número (Cliente)
  async findByNumero(numeroReclamo: string): Promise<LibroReclamacion> {
    const reclamo = await this.reclamacionRepo.findOne({
      where: { numero_reclamo: numeroReclamo, activo: 1 },
      relations: ['documentos', 'seguimientos'],
      order: { seguimientos: { fecha_cambio: 'ASC' } },
    });

    if (!reclamo) {
      throw new NotFoundException(`Reclamo ${numeroReclamo} no encontrado`);
    }

    return reclamo;
  }

  // Consultar reclamo por documento del cliente
  async findByDocumento(numeroDocumento: string): Promise<LibroReclamacion[]> {
    const reclamos = await this.reclamacionRepo.find({
      where: { numero_documento: numeroDocumento, activo: 1 },
      relations: ['documentos'],
      order: { fecha_registro: 'DESC' },
    });

    return reclamos;
  }

  // ====== ADMIN ======

  // Listar todos los reclamos con filtros (Admin)
  async findAll(filters: FilterLibroReclamacionDto): Promise<{ data: LibroReclamacion[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, numeroReclamo, numeroDocumento, tipoReclamo, estado, fechaDesde, fechaHasta } = filters;
    
    const query = this.reclamacionRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.documentos', 'd')
      .where('r.activo = :activo', { activo: 1 });

    if (numeroReclamo) {
      query.andWhere('r.numero_reclamo LIKE :numeroReclamo', { numeroReclamo: `%${numeroReclamo}%` });
    }

    if (numeroDocumento) {
      query.andWhere('r.numero_documento = :numeroDocumento', { numeroDocumento });
    }

    if (tipoReclamo) {
      query.andWhere('r.tipo_reclamo = :tipoReclamo', { tipoReclamo });
    }

    if (estado) {
      query.andWhere('r.estado = :estado', { estado });
    }

    if (fechaDesde && fechaHasta) {
      query.andWhere('r.fecha_registro BETWEEN :fechaDesde AND :fechaHasta', {
        fechaDesde,
        fechaHasta,
      });
    }

    const [data, total] = await query
      .orderBy('r.fecha_registro', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // Obtener un reclamo por ID (Admin)
  async findOne(id: number): Promise<LibroReclamacion> {
    const reclamo = await this.reclamacionRepo.findOne({
      where: { id, activo: 1 },
      relations: ['documentos', 'seguimientos'],
      order: { seguimientos: { fecha_cambio: 'ASC' } },
    });

    if (!reclamo) {
      throw new NotFoundException(`Reclamo con ID ${id} no encontrado`);
    }

    return reclamo;
  }

  // Actualizar estado del reclamo (Admin)
  async updateEstado(id: number, nuevoEstado: string, usuarioId?: number, observacion?: string): Promise<LibroReclamacion> {
    const reclamo = await this.findOne(id);
    const estadoAnterior = reclamo.estado;

    reclamo.estado = nuevoEstado;
    await this.reclamacionRepo.save(reclamo);

    // Registrar seguimiento
    await this.registrarSeguimiento(id, estadoAnterior, nuevoEstado, usuarioId, observacion);

    return reclamo;
  }

  // Responder reclamo (Admin)
  async responderReclamo(id: number, responderDto: ResponderReclamoDto): Promise<LibroReclamacion> {
    const reclamo = await this.findOne(id);

    reclamo.respuesta = responderDto.respuesta;
    reclamo.responsable_respuesta_id = responderDto.responsableRespuestaId;
    reclamo.fecha_respuesta = new Date();
    reclamo.estado = 'RESPONDIDO';

    await this.reclamacionRepo.save(reclamo);

    // Registrar seguimiento
    await this.registrarSeguimiento(
      id,
      reclamo.estado,
      'RESPONDIDO',
      responderDto.responsableRespuestaId,
      responderDto.observacion,
    );

    return reclamo;
  }

  // Cerrar reclamo (Admin)
  async cerrarReclamo(id: number, usuarioId?: number, observacion?: string): Promise<LibroReclamacion> {
    return this.updateEstado(id, 'CERRADO', usuarioId, observacion);
  }

  // Actualizar reclamo (Admin)
  async update(id: number, updateDto: UpdateLibroReclamacionDto): Promise<LibroReclamacion> {
    const reclamo = await this.findOne(id);

    Object.assign(reclamo, {
      ...updateDto,
      acepta_terminos: updateDto.aceptaTerminos !== undefined ? (updateDto.aceptaTerminos ? 1 : 0) : reclamo.acepta_terminos,
      autoriza_procesamiento: updateDto.autorizaProcesamiento !== undefined ? (updateDto.autorizaProcesamiento ? 1 : 0) : reclamo.autoriza_procesamiento,
    });

    return await this.reclamacionRepo.save(reclamo);
  }

  // Eliminar (soft delete) reclamo (Admin)
  async remove(id: number): Promise<void> {
    const reclamo = await this.findOne(id);
    reclamo.activo = 0;
    await this.reclamacionRepo.save(reclamo);
  }

  // ====== DOCUMENTOS ======

  // Guardar información del documento
  async saveDocumento(
    reclamoId: number,
    nombreArchivo: string,
    nombreOriginal: string,
    tipoMime: string,
    tamano: number,
    rutaArchivo: string,
  ): Promise<LibroReclamacionDocumento> {
    const reclamo = await this.findOne(reclamoId);

    const documento = this.documentoRepo.create({
      reclamo_id: reclamoId,
      nombre_archivo: nombreArchivo,
      nombre_original: nombreOriginal,
      tipo_mime: tipoMime,
      tamano: tamano,
      ruta_archivo: rutaArchivo,
    });

    return await this.documentoRepo.save(documento);
  }

  // Obtener documentos de un reclamo
  async getDocumentos(reclamoId: number): Promise<LibroReclamacionDocumento[]> {
    return await this.documentoRepo.find({
      where: { reclamo_id: reclamoId, activo: 1 },
      order: { fecha_subida: 'DESC' },
    });
  }

  // Eliminar documento
  async removeDocumento(documentoId: number): Promise<void> {
    const documento = await this.documentoRepo.findOne({
      where: { id: documentoId },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${documentoId} no encontrado`);
    }

    documento.activo = 0;
    await this.documentoRepo.save(documento);
  }

  // ====== ESTADÍSTICAS (Admin) ======

  async getEstadisticas(): Promise<any> {
    const total = await this.reclamacionRepo.count({ where: { activo: 1 } });
    
    const porEstado = await this.reclamacionRepo
      .createQueryBuilder('r')
      .select('r.estado', 'estado')
      .addSelect('COUNT(*)', 'cantidad')
      .where('r.activo = :activo', { activo: 1 })
      .groupBy('r.estado')
      .getRawMany();

    const porTipo = await this.reclamacionRepo
      .createQueryBuilder('r')
      .select('r.tipo_reclamo', 'tipo')
      .addSelect('COUNT(*)', 'cantidad')
      .where('r.activo = :activo', { activo: 1 })
      .groupBy('r.tipo_reclamo')
      .getRawMany();

    return {
      total,
      porEstado,
      porTipo,
    };
  }
}