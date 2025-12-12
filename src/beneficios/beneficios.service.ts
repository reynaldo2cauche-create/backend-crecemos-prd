import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Beneficio } from './beneficios.entity';

@Injectable()
export class BeneficiosService {
  constructor(
    @InjectRepository(Beneficio)
    private readonly beneficioRepository: Repository<Beneficio>,
  ) {}

  /**
   * Obtiene todos los beneficios activos
   */
  async findAll() {
    return await this.beneficioRepository.find({
      where: {
        activo: true
      },
      order: {
        categoria: 'ASC',
        nombre: 'ASC'
      }
    });
  }
}