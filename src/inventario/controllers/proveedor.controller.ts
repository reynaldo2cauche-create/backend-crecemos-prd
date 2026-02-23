import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProveedorService } from '../services/proveedor.service';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/inventario/proveedores')
@UseGuards(JwtAuthGuard)
export class ProveedorController {
  constructor(private readonly service: ProveedorService) {}

  @Get()
  findAll(@Query('todos') todos?: string) {
    return this.service.findAll(todos !== 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @Auditable({ modulo: 'INVENTARIO', accion: 'CREAR_PROVEEDOR' })
  create(@Body() dto: CreateProveedorDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Auditable({ modulo: 'INVENTARIO', accion: 'EDITAR_PROVEEDOR' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProveedorDto> & { user_actua_id?: number }) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/desactivar')
  @Auditable({ modulo: 'INVENTARIO', accion: 'DESACTIVAR_PROVEEDOR' })
  desactivar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.desactivar(+id, body.user_id);
  }

  @Patch(':id/activar')
  @Auditable({ modulo: 'INVENTARIO', accion: 'ACTIVAR_PROVEEDOR' })
  activar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.activar(+id, body.user_id);
  }
}
