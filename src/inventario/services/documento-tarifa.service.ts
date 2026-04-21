import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentoTarifa } from '../entities/documento-tarifa.entity';
import { CreateDocumentoTarifaDto } from '../dto/create-documento-tarifa.dto';
import { UpdateDocumentoTarifaDto } from '../dto/update-documento-tarifa.dto';

@Injectable()
export class DocumentoTarifaService {
  constructor(
    @InjectRepository(DocumentoTarifa)
    private readonly documentoTarifaRepo: Repository<DocumentoTarifa>,
  ) {}

  /**
   * Obtener todos los documentos tarifados activos
   */
  async findAll(): Promise<DocumentoTarifa[]> {
    return this.documentoTarifaRepo.find({
      where: { flgActivo: 1 },
      relations: ['tipoArchivo'],
      order: { nombre: 'ASC' },
    });
  }

  /**
   * Obtener todos los documentos (incluidos inactivos)
   */
  async findAllIncludingInactive(): Promise<DocumentoTarifa[]> {
    return this.documentoTarifaRepo.find({
      relations: ['tipoArchivo'],
      order: { flgActivo: 'DESC', nombre: 'ASC' },
    });
  }

  /**
   * Obtener un documento tarifado por ID
   */
  async findOne(id: number): Promise<DocumentoTarifa> {
    const documento = await this.documentoTarifaRepo.findOne({
      where: { id },
      relations: ['tipoArchivo'],
    });

    if (!documento) {
      throw new NotFoundException(`Documento tarifa con ID ${id} no encontrado`);
    }

    return documento;
  }

  /**
   * Crear nuevo documento tarifado
   */
  async create(dto: CreateDocumentoTarifaDto): Promise<DocumentoTarifa> {
    const documento = this.documentoTarifaRepo.create({
      tipoArchivoId: dto.tipo_archivo_id,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      precio: dto.precio,
      flgActivo: 1,
      userCreaId: dto.user_crea_id,
    });

    return this.documentoTarifaRepo.save(documento);
  }

  /**
   * Actualizar documento tarifado
   */
  async update(id: number, dto: UpdateDocumentoTarifaDto): Promise<DocumentoTarifa> {
    const documento = await this.findOne(id);

    if (dto.nombre !== undefined) documento.nombre = dto.nombre;
    if (dto.descripcion !== undefined) documento.descripcion = dto.descripcion;
    if (dto.precio !== undefined) documento.precio = dto.precio;
    if (dto.user_actua_id !== undefined) documento.userActuaId = dto.user_actua_id;

    return this.documentoTarifaRepo.save(documento);
  }

  /**
   * Desactivar documento tarifado (soft delete)
   */
  async desactivar(id: number, userActuaId?: number): Promise<DocumentoTarifa> {
    const documento = await this.findOne(id);
    documento.flgActivo = 0;
    if (userActuaId) documento.userActuaId = userActuaId;
    return this.documentoTarifaRepo.save(documento);
  }

  /**
   * Activar documento tarifado
   */
  async activar(id: number, userActuaId?: number): Promise<DocumentoTarifa> {
    const documento = await this.findOne(id);
    documento.flgActivo = 1;
    if (userActuaId) documento.userActuaId = userActuaId;
    return this.documentoTarifaRepo.save(documento);
  }

  /**
   * Obtener precio de un documento
   */
  async getPrecio(id: number): Promise<number> {
    const documento = await this.findOne(id);
    return Number(documento.precio);
  }
}
