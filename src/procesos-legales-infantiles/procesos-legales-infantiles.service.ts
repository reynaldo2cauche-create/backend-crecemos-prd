import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcesoLegalInfantil } from './entities/proceso-legal-infantil.entity';

@Injectable()
export class ProcesosLegalesInfantilesService {
  constructor(
    @InjectRepository(ProcesoLegalInfantil)
    private procesoLegalRepository: Repository<ProcesoLegalInfantil>,
  ) {}

  async findAll(): Promise<ProcesoLegalInfantil[]> {
    return this.procesoLegalRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ProcesoLegalInfantil> {
    return this.procesoLegalRepository.findOne({
      where: { id, activo: true },
    });
  }
}
