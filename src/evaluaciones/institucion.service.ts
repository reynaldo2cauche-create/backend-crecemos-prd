// src/evaluaciones/services/institucion.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institucion } from './institucion.entity';

@Injectable()
export class InstitucionService {
  constructor(
    @InjectRepository(Institucion)
    private institucionRepository: Repository<Institucion>
  ) {}

  async findAll() {
    return await this.institucionRepository.find({
      select: ['id', 'nombre', 'direccion', 'telefono'],
      order: { nombre: 'ASC' }
    });
  }
}