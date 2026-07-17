import { Controller, Get, Post, Body, Param, Query, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VentaProductoService } from '../services/venta-producto.service';
import { CreateVentaProductoDto } from '../dto/create-venta-producto.dto';
import { UpdateVentaProductoDto } from '../dto/update-venta-producto.dto';
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

  @Patch('pago/:pagoId/validar')
  @Auditable({ modulo: 'VENTAS', accion: 'VALIDAR_PAGO_VENTA' })
  validarPago(@Param('pagoId') pagoId: string, @Request() req) {
    return this.service.validarPago(+pagoId, req.user?.id);
  }

  @Patch(':id')
  @Auditable({ modulo: 'VENTAS', accion: 'ACTUALIZAR_VENTA_PRODUCTO' })
  update(@Param('id') id: string, @Body() dto: UpdateVentaProductoDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @Auditable({ modulo: 'VENTAS', accion: 'ELIMINAR_VENTA_PRODUCTO' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
