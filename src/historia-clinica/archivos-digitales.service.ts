import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchivoDigital } from './entities/archivo-digital.entity';
import { TipoArchivo } from './entities/tipo-archivo.entity';
import { CreateArchivoDigitalDto } from './dto/create-archivo-digital.dto';
import { UpdateArchivoDigitalDto } from './dto/update-archivo-digital.dto';

import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ArchivosDigitalesService {
  constructor(
    @InjectRepository(ArchivoDigital)
    private archivoDigitalRepository: Repository<ArchivoDigital>,
    @InjectRepository(TipoArchivo)
    private tipoArchivoRepository: Repository<TipoArchivo>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(TrabajadorCentro)
    private terapeutaRepository: Repository<TrabajadorCentro>,
  ) {}

  // Métodos para Archivos Digitales
  async create(createArchivoDigitalDto: CreateArchivoDigitalDto): Promise<ArchivoDigital> {
    // Verificar que el terapeuta existe
    const terapeuta = await this.terapeutaRepository.findOne({
      where: { id: createArchivoDigitalDto.terapeutaId }
    });
    if (!terapeuta) {
      throw new NotFoundException('Terapeuta no encontrado');
    }

    // Verificar que el tipo de archivo existe
    const tipoArchivo = await this.tipoArchivoRepository.findOne({
      where: {
        id: createArchivoDigitalDto.tipoArchivoId,
        activo: 1
      }
    });
    if (!tipoArchivo) {
      throw new NotFoundException(`Tipo de archivo con ID ${createArchivoDigitalDto.tipoArchivoId} no encontrado o inactivo`);
    }

    // Verificar que el paciente existe si se proporciona
    let paciente = null;
    if (createArchivoDigitalDto.pacienteId) {
      paciente = await this.pacienteRepository.findOne({
        where: { id: createArchivoDigitalDto.pacienteId }
      });
      if (!paciente) {
        throw new NotFoundException('Paciente no encontrado');
      }
    }

    // Crear el archivo digital con las relaciones
    const archivoDigital = this.archivoDigitalRepository.create({
      ...createArchivoDigitalDto,
      terapeuta,
      tipoArchivo,
      paciente
    });

    return await this.archivoDigitalRepository.save(archivoDigital);
  }

  async findAll(): Promise<ArchivoDigital[]> {
    return await this.archivoDigitalRepository.find({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: { activo: true },
      order: { fechaCreacion: 'DESC' }
    });
  }

  async findByPaciente(pacienteId: number): Promise<ArchivoDigital[]> {
    return await this.archivoDigitalRepository.find({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: { paciente: { id: pacienteId }, activo: true },
      order: { fechaCreacion: 'DESC' }
    });
  }

  async findByTerapeuta(terapeutaId: number): Promise<ArchivoDigital[]> {
    return await this.archivoDigitalRepository.find({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: { terapeuta: { id: terapeutaId }, activo: true },
      order: { fechaCreacion: 'DESC' }
    });
  }

  async findOne(id: number): Promise<ArchivoDigital> {
    const archivoDigital = await this.archivoDigitalRepository.findOne({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: { id, activo: true }
    });

    if (!archivoDigital) {
      throw new NotFoundException('Archivo digital no encontrado');
    }

    return archivoDigital;
  }

  async update(id: number, updateArchivoDigitalDto: UpdateArchivoDigitalDto): Promise<ArchivoDigital> {
    const archivoDigital = await this.findOne(id);

    // Verificar que el terapeuta existe si se está actualizando
    if (updateArchivoDigitalDto.terapeutaId) {
      const terapeuta = await this.terapeutaRepository.findOne({
        where: { id: updateArchivoDigitalDto.terapeutaId }
      });
      if (!terapeuta) {
        throw new NotFoundException('Terapeuta no encontrado');
      }
    }

    // Verificar que el tipo de archivo existe si se está actualizando
    if (updateArchivoDigitalDto.tipoArchivoId) {
      const tipoArchivo = await this.tipoArchivoRepository.findOne({
        where: { id: updateArchivoDigitalDto.tipoArchivoId }
      });
      if (!tipoArchivo) {
        throw new NotFoundException('Tipo de archivo no encontrado');
      }
    }

    // Verificar que el paciente existe si se está actualizando
    if (updateArchivoDigitalDto.pacienteId) {
      const paciente = await this.pacienteRepository.findOne({
        where: { id: updateArchivoDigitalDto.pacienteId }
      });
      if (!paciente) {
        throw new NotFoundException('Paciente no encontrado');
      }
    }

    Object.assign(archivoDigital, updateArchivoDigitalDto);
    return await this.archivoDigitalRepository.save(archivoDigital);
  }

  async remove(id: number): Promise<{ message: string; paciente?: any }> {
    const archivoDigital = await this.findOne(id);

    // Eliminar el archivo físico del sistema de archivos
    try {
      const rutaCompleta = path.join(process.cwd(), 'uploads', archivoDigital.rutaArchivo);
      if (fs.existsSync(rutaCompleta)) {
        fs.unlinkSync(rutaCompleta);
      }
    } catch (error) {
      console.error('Error al eliminar archivo físico:', error);
    }

    // Marcar como inactivo en la base de datos
    archivoDigital.activo = false;
    await this.archivoDigitalRepository.save(archivoDigital);

    // Retornar información del paciente para auditoría
    return {
      message: 'Archivo eliminado correctamente',
      paciente: archivoDigital.paciente ? {
        id: archivoDigital.paciente.id,
        nombres: archivoDigital.paciente.nombres,
        apellidos: `${archivoDigital.paciente.apellido_paterno} ${archivoDigital.paciente.apellido_materno}`.trim()
      } : null
    };
  }

  // Método para obtener archivos por terapeuta y paciente
  async findByTerapeutaAndPaciente(terapeutaId: number, pacienteId: number): Promise<ArchivoDigital[]> {
    return await this.archivoDigitalRepository.find({
      relations: ['paciente', 'terapeuta', 'tipoArchivo'],
      where: { 
        terapeuta: { id: terapeutaId }, 
        paciente: { id: pacienteId },
        activo: true 
      },
      order: { fechaCreacion: 'DESC' }
    });
  }

  // Método para obtener todos los tipos de archivo
  async findAllTiposArchivo(): Promise<TipoArchivo[]> {
    return await this.tipoArchivoRepository.find({
      where: { activo: 1 },
      order: { nombre: 'ASC' }
    });
  }
}
