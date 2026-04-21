import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParejaPaciente } from '../entities/pareja-paciente.entity';
import { CreateParejaDto } from '../dto/create-pareja.dto';

@Injectable()
export class ParejaPacienteService {
  constructor(
    @InjectRepository(ParejaPaciente)
    private parejaPacienteRepository: Repository<ParejaPaciente>,
  ) {}

  async create(pacienteId: number, parejaData: CreateParejaDto): Promise<ParejaPaciente> {
    const pareja = this.parejaPacienteRepository.create({
      paciente: { id: pacienteId },
      nombres: parejaData.nombres,
      apellido_paterno: parejaData.apellido_paterno,
      apellido_materno: parejaData.apellido_materno,
      tipo_documento: { id: parejaData.tipo_documento_id },
      numero_documento: parejaData.numero_documento,
      celular: parejaData.celular,
      direccion: parejaData.direccion,
      email: parejaData.email,
    });

    return this.parejaPacienteRepository.save(pareja);
  }

  async findByPaciente(pacienteId: number): Promise<ParejaPaciente[]> {
    return this.parejaPacienteRepository.find({
      where: { paciente: { id: pacienteId } },
      relations: ['tipo_documento'],
      order: { created_at: 'DESC' }
    });
  }

  async update(id: number, parejaData: Partial<CreateParejaDto>): Promise<ParejaPaciente> {
    const pareja = await this.parejaPacienteRepository.findOne({ where: { id } });
    if (!pareja) {
      throw new Error('Pareja no encontrada');
    }

    Object.assign(pareja, parejaData);
    if (parejaData.tipo_documento_id) {
      pareja.tipo_documento = { id: parejaData.tipo_documento_id } as any;
    }

    return this.parejaPacienteRepository.save(pareja);
  }

  async delete(id: number): Promise<void> {
    await this.parejaPacienteRepository.delete(id);
  }
} 