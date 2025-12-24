// src/convenios/convenios.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Convenio } from './entities/convenio.entity';
import { PacienteConvenio } from './entities/paciente-convenio.entity';
import { CreateConvenioDto } from './dto/create-convenio.dto';
import { UpdateConvenioDto } from './dto/update-convenio.dto';
import { CreatePacienteConvenioDto } from './dto/create-paciente-convenio.dto';
import { UpdatePacienteConvenioDto } from './dto/update-paciente-convenio.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConveniosService {
  private readonly uploadPath = 'uploads/convenios';

  constructor(
    @InjectRepository(Convenio)
    private readonly convenioRepo: Repository<Convenio>,
    @InjectRepository(PacienteConvenio)
    private readonly pacienteConvenioRepo: Repository<PacienteConvenio>,
  ) {
    // Crear carpeta de uploads si no existe
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  // =============== CONVENIOS ===============

  async create(dto: CreateConvenioDto, userId?: number, file?: Express.Multer.File): Promise<Convenio> {
    let logoUrl = null;

    // Si se subió un archivo, usar la ruta generada por Multer
    if (file) {
      logoUrl = `/uploads/convenios/${file.filename}`;
      console.log('Logo guardado en:', logoUrl);
    }

    const convenio = this.convenioRepo.create({
      ...dto,
      logo_url: logoUrl,
      user_id_crea: userId,
      user_id_actua: userId,
    });

    return await this.convenioRepo.save(convenio);
  }

  async findAll(activo?: boolean): Promise<Convenio[]> {
    const where: any = {};
    if (activo !== undefined) {
      where.activo = activo;
    }

    return await this.convenioRepo.find({
      where,
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Convenio> {
    const convenio = await this.convenioRepo.findOne({ 
      where: { id },
      relations: ['pacienteConvenios']
    });

    if (!convenio) {
      throw new NotFoundException(`Convenio con ID ${id} no encontrado`);
    }

    return convenio;
  }

  async update(
    id: number, 
    dto: UpdateConvenioDto, 
    userId?: number, 
    file?: Express.Multer.File
  ): Promise<Convenio> {
    const convenio = await this.findOne(id);
    
    // Si se subió un nuevo archivo
    if (file) {
      // Eliminar el logo anterior si existe
      if (convenio.logo_url) {
        await this.deleteLogo(convenio.logo_url);
      }
      // Asignar la nueva ruta
      dto.logo_url = `/uploads/convenios/${file.filename}`;
      console.log('Logo actualizado:', dto.logo_url);
    }

    Object.assign(convenio, dto);
    convenio.user_id_actua = userId;

    return await this.convenioRepo.save(convenio);
  }

  async remove(id: number): Promise<void> {
    const convenio = await this.findOne(id);
    
    // Verificar si tiene pacientes asociados
    const pacientesCount = await this.pacienteConvenioRepo.count({ 
      where: { convenio_id: id } 
    });

    if (pacientesCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el convenio porque tiene ${pacientesCount} paciente(s) asociado(s)`
      );
    }

    // Eliminar logo si existe
    if (convenio.logo_url) {
      await this.deleteLogo(convenio.logo_url);
    }

    await this.convenioRepo.remove(convenio);
  }

  async setEstado(id: number, activo: boolean, userId?: number): Promise<Convenio> {
    const convenio = await this.findOne(id);
    convenio.activo = activo;
    convenio.user_id_actua = userId;
    return await this.convenioRepo.save(convenio);
  }

  // =============== HELPER METHODS ===============

  private async deleteLogo(logoUrl: string): Promise<void> {
    if (!logoUrl) return;

    try {
      // Extraer nombre de archivo de la URL
      const filename = path.basename(logoUrl);
      const filepath = path.join(this.uploadPath, filename);

      // Eliminar archivo si existe
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log('Logo eliminado:', filepath);
      }
    } catch (error) {
      console.error('Error al eliminar logo:', error);
    }
  }

  // =============== PACIENTE-CONVENIO ===============

  async asignarConvenioAPaciente(dto: CreatePacienteConvenioDto, userId?: number): Promise<PacienteConvenio> {
    const existente = await this.pacienteConvenioRepo.findOne({
      where: {
        paciente_id: dto.paciente_id,
        convenio_id: dto.convenio_id,
      },
    });

    if (existente) {
      throw new ConflictException('El paciente ya está asignado a este convenio');
    }

    const pacienteConvenio = this.pacienteConvenioRepo.create({
      ...dto,
      user_id_crea: userId,
      user_id_actua: userId,
    });

    return await this.pacienteConvenioRepo.save(pacienteConvenio);
  }

  async findConveniosByPaciente(pacienteId: number): Promise<PacienteConvenio[]> {
    return await this.pacienteConvenioRepo.find({
      where: { paciente_id: pacienteId },
      order: { created_at: 'DESC' },
    });
  }

  async findPacientesByConvenio(convenioId: number, activo?: boolean): Promise<PacienteConvenio[]> {
    const where: any = { convenio_id: convenioId };
    if (activo !== undefined) {
      where.activo = activo;
    }

    return await this.pacienteConvenioRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOnePacienteConvenio(id: number): Promise<PacienteConvenio> {
    const pacienteConvenio = await this.pacienteConvenioRepo.findOne({ 
      where: { id } 
    });

    if (!pacienteConvenio) {
      throw new NotFoundException(`Relación paciente-convenio con ID ${id} no encontrada`);
    }

    return pacienteConvenio;
  }

  async updatePacienteConvenio(
    id: number, 
    dto: UpdatePacienteConvenioDto, 
    userId?: number
  ): Promise<PacienteConvenio> {
    const pacienteConvenio = await this.findOnePacienteConvenio(id);
    
    Object.assign(pacienteConvenio, dto);
    pacienteConvenio.user_id_actua = userId;

    return await this.pacienteConvenioRepo.save(pacienteConvenio);
  }

  async removePacienteConvenio(id: number): Promise<void> {
    const pacienteConvenio = await this.findOnePacienteConvenio(id);
    await this.pacienteConvenioRepo.remove(pacienteConvenio);
  }

  async setEstadoPacienteConvenio(
    id: number, 
    activo: boolean, 
    userId?: number
  ): Promise<PacienteConvenio> {
    const pacienteConvenio = await this.findOnePacienteConvenio(id);
    pacienteConvenio.activo = activo;
    pacienteConvenio.user_id_actua = userId;
    return await this.pacienteConvenioRepo.save(pacienteConvenio);
  }
}