import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VentaProductoService } from '../services/venta-producto.service';
import { CreateVentaProductoDto } from '../dto/create-venta-producto.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/ventas/productos')
@UseGuards(JwtAuthGuard)
export class VentaProductoController {
  constructor(private readonly service: VentaProductoService) {}

  @Get()
  findAll(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.findAll({ desde, hasta });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @Auditable({ modulo: 'VENTAS', accion: 'REGISTRAR_VENTA_PRODUCTO' })
  create(@Body() dto: CreateVentaProductoDto) {
    return this.service.create(dto);
  }
}
