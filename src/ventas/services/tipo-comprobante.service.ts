import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoComprobante } from '../entities/tipo-comprobante.entity';

@Injectable()
export class TipoComprobanteService {
  constructor(
    @InjectRepository(TipoComprobante)
    private readonly repo: Repository<TipoComprobante>,
  ) {}

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
}