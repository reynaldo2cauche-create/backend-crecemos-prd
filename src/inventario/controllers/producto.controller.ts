import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProductoService } from '../services/producto.service';
import { CreateProductoDto } from '../dto/create-producto.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/inventario/productos')
@UseGuards(JwtAuthGuard)
export class ProductoController {
  constructor(private readonly service: ProductoService) {}

  @Get('stock-bajo')
  findStockBajo() {
    return this.service.findStockBajo();
  }

  @Get('para-venta')
  findParaVenta() {
    return this.service.findParaVenta();
  }

  @Get('uso-interno')
  findUsoInterno() {
    return this.service.findUsoInterno();
  }

  @Get('por-categoria/:categoriaId')
  findPorCategoria(@Param('categoriaId') id: string) {
    return this.service.findPorCategoria(+id);
  }

  @Get()
  findAll(@Query('todos') todos?: string) {
    return this.service.findAll(todos !== 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @Auditable({ modulo: 'INVENTARIO', accion: 'CREAR_PRODUCTO' })
  create(@Body() dto: CreateProductoDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Auditable({ modulo: 'INVENTARIO', accion: 'EDITAR_PRODUCTO' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductoDto> & { user_actua_id?: number }) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/desactivar')
  @Auditable({ modulo: 'INVENTARIO', accion: 'DESACTIVAR_PRODUCTO' })
  desactivar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.desactivar(+id, body.user_id);
  }

  @Patch(':id/activar')
  @Auditable({ modulo: 'INVENTARIO', accion: 'ACTIVAR_PRODUCTO' })
  activar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.activar(+id, body.user_id);
  }
}