// ============================================
// src/archivos/archivos-terapia.service.ts
// ============================================
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchivoTerapia } from './entities/archivo-terapia.entity';
import { CrearArchivoTerapiaDto } from './dto/crear-archivo-terapia.dto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ArchivosTerapiaService {
  private readonly uploadPath = './uploads/archivos-terapia';

  constructor(
    @InjectRepository(ArchivoTerapia)
    private archivoTerapiaRepo: Repository<ArchivoTerapia>,
  ) {
    this.createUploadDirectory();
  }

  private async createUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creando directorio:', error);
    }
  }

  // ============================================
  // SUBIR ARCHIVO DE TERAPIA
  // ============================================
  async subirArchivo(
    file: Express.Multer.File,
    dto: CrearArchivoTerapiaDto,
    trabajadorId: number,
    rolTrabajador: string,
  ): Promise<ArchivoTerapia> {
    // Validar tipo de archivo
    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
    ];

    if (!tiposPermitidos.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo PDF, Word, JPG, PNG');
    }

    // Generar nombre único para el archivo
    const extension = path.extname(file.originalname);
    const nombreArchivo = `${uuidv4()}${extension}`;
    const rutaCompleta = path.join(this.uploadPath, nombreArchivo);

    // Guardar archivo en disco
    await fs.writeFile(rutaCompleta, file.buffer);

    // Si es admin o admisión y marca como compartido
    const esCompartido = ['admin', 'admision'].includes(rolTrabajador.toLowerCase()) 
      ? (dto.esCompartido || 0) 
      : 0; // Terapeutas solo pueden subir archivos privados

    // Crear registro en BD
    const archivo = this.archivoTerapiaRepo.create({
      pacienteId: dto.pacienteId,
      trabajadorSubioId: trabajadorId,
      tipoArchivoId: dto.tipoArchivoId,
      nombreArchivo,
      nombreOriginal: file.originalname,
      tipoMime: file.mimetype,
      tamano: file.size,
      rutaArchivo: rutaCompleta,
      descripcion: dto.descripcion,
      esCompartido,
    });

    return await this.archivoTerapiaRepo.save(archivo);
  }

  // ============================================
  // LISTAR ARCHIVOS DE TERAPIA
  // ============================================
  async listarArchivos(
    trabajadorId: number,
    rolTrabajador: string,
    pacienteId?: number,
  ): Promise<ArchivoTerapia[]> {
    const query = this.archivoTerapiaRepo
      .createQueryBuilder('archivo')
      .leftJoinAndSelect('archivo.paciente', 'paciente')
      .leftJoinAndSelect('archivo.trabajadorSubio', 'trabajadorSubio')
      .leftJoinAndSelect('archivo.tipoArchivo', 'tipoArchivo')
      .where('archivo.activo = :activo', { activo: 1 });

    // Si es terapeuta: ver solo archivos que subió O archivos compartidos de sus pacientes
    if (rolTrabajador.toLowerCase() === 'terapeuta') {
      query.andWhere(
        '(archivo.trabajadorSubioId = :trabajadorId OR archivo.esCompartido = 1)',
        { trabajadorId },
      );
    }

    if (pacienteId) {
      query.andWhere('archivo.pacienteId = :pacienteId', { pacienteId });
    }

    return await query.orderBy('archivo.fechaCreacion', 'DESC').getMany();
  }

  // ============================================
  // OBTENER UN ARCHIVO ESPECÍFICO
  // ============================================
  async obtenerArchivo(
    id: number,
    trabajadorId: number,
    rolTrabajador: string,
  ): Promise<{ buffer: Buffer; mimetype: string; filename: string }> {
    const archivo = await this.archivoTerapiaRepo.findOne({
      where: { id, activo: 1 },
    });

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Validar permisos
    const puedeVer = 
      ['admin', 'admision'].includes(rolTrabajador.toLowerCase()) || // Admin/admisión ven todo
      archivo.trabajadorSubioId === trabajadorId || // Quien subió puede ver
      archivo.esCompartido === 1; // Archivos compartidos todos los terapeutas pueden ver

    if (!puedeVer) {
      throw new ForbiddenException('No tienes permisos para ver este archivo');
    }

    // Leer archivo del disco
    const buffer = await fs.readFile(archivo.rutaArchivo);

    return {
      buffer,
      mimetype: archivo.tipoMime,
      filename: archivo.nombreOriginal,
    };
  }

  // ============================================
  // ELIMINAR ARCHIVO (Soft delete)
  // ============================================
  async eliminarArchivo(
    id: number,
    trabajadorId: number,
    rolTrabajador: string,
  ): Promise<void> {
    const archivo = await this.archivoTerapiaRepo.findOne({
      where: { id, activo: 1 },
    });

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Solo admin, admisión o quien subió puede eliminar
    const puedeEliminar =
      ['admin', 'admision'].includes(rolTrabajador.toLowerCase()) ||
      archivo.trabajadorSubioId === trabajadorId;

    if (!puedeEliminar) {
      throw new ForbiddenException('No tienes permisos para eliminar este archivo');
    }

    // Soft delete
    archivo.activo = 0;
    await this.archivoTerapiaRepo.save(archivo);
  }

  // ============================================
  // CAMBIAR VISIBILIDAD (Solo admin/admisión)
  // ============================================
  async cambiarVisibilidad(
    id: number,
    esCompartido: number,
    rolTrabajador: string,
  ): Promise<ArchivoTerapia> {
    if (!['admin', 'admision'].includes(rolTrabajador.toLowerCase())) {
      throw new ForbiddenException('Solo admin y admisión pueden cambiar visibilidad');
    }

    const archivo = await this.archivoTerapiaRepo.findOne({
      where: { id, activo: 1 },
    });

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    archivo.esCompartido = esCompartido;
    return await this.archivoTerapiaRepo.save(archivo);
  }
}