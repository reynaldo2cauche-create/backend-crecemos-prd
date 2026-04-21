import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoComprobante } from '../entities/tipo-comprobante.entity';

@Controller('backend_api/ventas/tipos-comprobante')
@UseGuards(JwtAuthGuard)
export class TipoComprobanteController {
  constructor(
    @InjectRepository(TipoComprobante)
    private readonly repo: Repository<TipoComprobante>,
  ) {}

  @Get()
  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
}