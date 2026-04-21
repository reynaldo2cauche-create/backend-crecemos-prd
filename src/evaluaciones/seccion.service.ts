// src/evaluaciones/services/seccion.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seccion } from './seccion.entity';

@Injectable()
export class SeccionService {
  constructor(
    @InjectRepository(Seccion)
    private seccionRepository: Repository<Seccion>
  ) {}

  async findAll() {
    return await this.seccionRepository.find({
      select: ['id', 'nombre'],
      order: { nombre: 'ASC' }
    });
  }
}