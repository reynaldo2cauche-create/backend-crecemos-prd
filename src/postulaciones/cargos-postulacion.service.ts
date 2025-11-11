// =====================================================
// src/modules/catalogos/cargo-postulacion.service.ts
// =====================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CargoPostulacion } from './cargo-postulacion.entity';

@Injectable()
export class CargoPostulacionService {
  constructor(
    @InjectRepository(CargoPostulacion)
    private readonly cargoRepository: Repository<CargoPostulacion>,
  ) {}

  async findAllActivos(): Promise<CargoPostulacion[]> {
    return await this.cargoRepository.find({
      where: { activo: 1 },
      order: { descripcion: 'ASC' },
    });
  }
}