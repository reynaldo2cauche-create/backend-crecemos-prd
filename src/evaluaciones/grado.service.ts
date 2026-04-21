// src/evaluaciones/services/grado.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grado } from './grado.entity';

@Injectable()
export class GradoService {
  constructor(
    @InjectRepository(Grado)
    private gradoRepository: Repository<Grado>
  ) {}

  async findAll() {
    return await this.gradoRepository.find({
      select: ['id', 'nombre', 'nivel'],
      order: { nombre: 'ASC' }
    });
  }
}