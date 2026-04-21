import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoPaciente } from './estado-paciente.entity';

@Injectable()
export class EstadoPacienteService {
  constructor(
    @InjectRepository(EstadoPaciente)
    private estadoPacienteRepository: Repository<EstadoPaciente>,
  ) {}

  async findAll(): Promise<EstadoPaciente[]> {
    return this.estadoPacienteRepository.find({
      where: { activo: true },
      order: { id: 'ASC' }
    });
  }

  async findOne(id: number): Promise<EstadoPaciente> {
    return this.estadoPacienteRepository.findOne({
      where: { id, activo: true }
    });
  }

  async create(nombre: string): Promise<EstadoPaciente> {
    const estado = this.estadoPacienteRepository.create({
      nombre,
      activo: true
    });
    return this.estadoPacienteRepository.save(estado);
  }

  async update(id: number, nombre: string): Promise<EstadoPaciente> {
    await this.estadoPacienteRepository.update(id, { nombre });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.estadoPacienteRepository.update(id, { activo: false });
  }
} 