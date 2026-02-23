import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ServicioTarifaService } from '../services/servicio-tarifa.service';
import { CreateServicioTarifaDto, UpdateServicioTarifaDto } from '../dto/create-servicio-tarifa.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/inventario/tarifas')
@UseGuards(JwtAuthGuard)
export class ServicioTarifaController {
  constructor(private readonly service: ServicioTarifaService) {}

  @Get()
  findAll(@Query('todos') todos?: string) {
    return this.service.findAll(todos !== 'true');
  }

  @Get('servicio/:servicioId')
  findByServicio(@Param('servicioId') id: string) {
    return this.service.findByServicio(+id);
  }

  /** El frontend llama esto al seleccionar servicio + motivo para autocompletar el precio */
  @Get('precio')
  getPrecio(
    @Query('servicio_id') servicioId: string,
    @Query('motivo_cita_id') motivoCitaId: string,
  ) {
    return this.service.getPrecio(+servicioId, +motivoCitaId);
  }

  @Post()
  @Auditable({ modulo: 'INVENTARIO', accion: 'CREAR_TARIFA' })
  create(@Body() dto: CreateServicioTarifaDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Auditable({ modulo: 'INVENTARIO', accion: 'EDITAR_TARIFA' })
  update(@Param('id') id: string, @Body() dto: UpdateServicioTarifaDto) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/desactivar')
  @Auditable({ modulo: 'INVENTARIO', accion: 'DESACTIVAR_TARIFA' })
  desactivar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.desactivar(+id, body.user_id);
  }

  @Patch(':id/activar')
  @Auditable({ modulo: 'INVENTARIO', accion: 'ACTIVAR_TARIFA' })
  activar(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.service.activar(+id, body.user_id);
  }
}
