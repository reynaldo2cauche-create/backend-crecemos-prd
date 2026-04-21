import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CategoriaProductoService } from '../services/categoria-producto.service';
import { CreateCategoriaProductoDto } from '../dto/create-categoria-producto.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/inventario/categorias')
@UseGuards(JwtAuthGuard)
export class CategoriaProductoController {
  constructor(private readonly service: CategoriaProductoService) {}

  @Get()
  findAll(@Query('todos') todos?: string) {
    return this.service.findAll(todos !== 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @Auditable({ modulo: 'INVENTARIO', accion: 'CREAR_CATEGORIA_PRODUCTO' })
  create(@Body() dto: CreateCategoriaProductoDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Auditable({ modulo: 'INVENTARIO', accion: 'EDITAR_CATEGORIA_PRODUCTO' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoriaProductoDto> & { user_actua_id?: number }) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/desactivar')
  @Auditable({ modulo: 'INVENTARIO', accion: 'DESACTIVAR_CATEGORIA_PRODUCTO' })
  desactivar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.desactivar(+id, body.user_id);
  }

  @Patch(':id/activar')
  @Auditable({ modulo: 'INVENTARIO', accion: 'ACTIVAR_CATEGORIA_PRODUCTO' })
  activar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.activar(+id, body.user_id);
  }
}
