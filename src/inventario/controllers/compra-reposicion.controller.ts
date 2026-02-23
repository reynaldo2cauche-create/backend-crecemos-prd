import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompraReposicionService } from '../services/compra-reposicion.service';
import { CreateCompraReposicionDto } from '../dto/create-compra-reposicion.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/inventario/compras')
@UseGuards(JwtAuthGuard)
export class CompraReposicionController {
  constructor(private readonly service: CompraReposicionService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @Auditable({ modulo: 'INVENTARIO', accion: 'REGISTRAR_COMPRA_REPOSICION' })
  create(@Body() dto: CreateCompraReposicionDto) {
    return this.service.create(dto);
  }
}
