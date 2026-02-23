import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VentaServicioService } from '../services/venta-servicio.service';
import { CreateVentaServicioDto } from '../dto/create-venta-servicio.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/ventas/servicios')
@UseGuards(JwtAuthGuard)
export class VentaServicioController {
  constructor(private readonly service: VentaServicioService) {}

  @Get('pendientes/paciente/:pacienteId')
  findPendientesPorPaciente(@Param('pacienteId') id: string) {
    return this.service.findPendientesPorPaciente(+id);
  }

  @Get()
  findAll(
    @Query('pacienteId') pacienteId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.findAll({
      pacienteId: pacienteId ? +pacienteId : undefined,
      desde,
      hasta,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @Auditable({ modulo: 'VENTAS', accion: 'REGISTRAR_VENTA_SERVICIO' })
  create(@Body() dto: CreateVentaServicioDto) {
    return this.service.create(dto);
  }

  @Patch('detalle/:detalleId/sesion-usada')
  @Auditable({ modulo: 'VENTAS', accion: 'REGISTRAR_SESION_USADA' })
  registrarSesionUsada(@Param('detalleId') id: string) {
    return this.service.registrarSesionUsada(+id);
  }
}
