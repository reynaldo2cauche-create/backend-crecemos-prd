import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaqueteComboService } from '../services/paquete-combo.service';
import { CreatePaqueteComboDto } from '../dto/create-paquete-combo.dto';
import { UpdatePaqueteComboDto } from '../dto/update-paquete-combo.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/inventario/paquete-combo')
@UseGuards(JwtAuthGuard)
export class PaqueteComboController {
  constructor(private readonly service: PaqueteComboService) {}

  @Get()
  findAll(@Query('todos') todos?: string) {
    const soloActivos = todos !== 'true';
    return this.service.findAll(soloActivos);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @Auditable({ modulo: 'INVENTARIO', accion: 'CREAR_PAQUETE_COMBO' })
  create(@Body() dto: CreatePaqueteComboDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auditable({ modulo: 'INVENTARIO', accion: 'ACTUALIZAR_PAQUETE_COMBO' })
  update(@Param('id') id: string, @Body() dto: UpdatePaqueteComboDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @Auditable({ modulo: 'INVENTARIO', accion: 'ELIMINAR_PAQUETE_COMBO' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Patch(':id/toggle-activo')
  @Auditable({ modulo: 'INVENTARIO', accion: 'TOGGLE_PAQUETE_COMBO' })
  toggleActivo(@Param('id') id: string) {
    return this.service.toggleActivo(+id);
  }
}
