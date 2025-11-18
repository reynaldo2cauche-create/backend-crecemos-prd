
// =====================================================
// src/modules/catalogos/estado-postulacion.service.ts
// =====================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoPostulacion } from './estado-postulacion.entity';

@Injectable()
export class EstadoPostulacionService {
  constructor(
    @InjectRepository(EstadoPostulacion)
    private readonly estadoRepository: Repository<EstadoPostulacion>,
  ) {}

  async findAllActivos(): Promise<EstadoPostulacion[]> {
    return await this.estadoRepository.find({
      where: { activo: 1 },
      order: { id: 'ASC' },
    });
  }
}
