// src/evaluaciones/services/trabajador-centro.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorCentro } from './trabajador-centro.entity';

@Injectable()
export class TrabajadorCentroService {
  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>
  ) {}

  async findAll() {
    return await this.trabajadorRepository.find({
      select: ['id', 'nombres', 'apellidos', 'dni', 'cargo', 'especialidad'],
      relations: ['institucion'],
      where: { estado: true },
      order: { apellidos: 'ASC', nombres: 'ASC' }
    });
  }
}