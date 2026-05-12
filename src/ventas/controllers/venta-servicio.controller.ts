import { Controller, Get, Post, Body, Param, Query, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VentaServicioService } from '../services/venta-servicio.service';
import { CreateVentaServicioDto } from '../dto/create-venta-servicio.dto';
import { UpdateVentaServicioDto } from '../dto/update-venta-servicio.dto';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/ventas/servicios')
@UseGuards(JwtAuthGuard)
export class VentaServicioController {
  constructor(private readonly service: VentaServicioService) {}

  @Get('pendientes/paciente/:pacienteId')
  findPendientesPorPaciente(@Param('pacienteId') id: string) {
    return this.service.findPendientesPorPaciente(+id);
  }

  @Get(':id/verificar-citas')
  verificarTieneCitas(@Param('id') id: string) {
    return this.service.verificarTieneCitas(+id);
  }

  @Get('historial')
  findHistorial(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('pacienteId') pacienteId?: string,
    @Query('metodoPagoId') metodoPagoId?: string,
  ) {
    return this.service.findHistorial({
      page: page ? +page : 0,
      limit: limit ? +limit : 12,
      tipo: tipo || 'todos',
      desde,
      hasta,
      pacienteId: pacienteId ? +pacienteId : undefined,
      metodoPagoId: metodoPagoId ? +metodoPagoId : undefined,
    });
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
    console.log('📦 BODY RECIBIDO:', JSON.stringify(dto, null, 2));
    return this.service.create(dto);
    
  }

  @Patch('pago/:pagoId/validar')
  validarPago(@Param('pagoId') pagoId: string, @Request() req) {
    return this.service.validarPago(+pagoId, req.user?.id);
  }

  @Patch('detalle/:detalleId/sesion-usada')
  @Auditable({ modulo: 'VENTAS', accion: 'REGISTRAR_SESION_USADA' })
  registrarSesionUsada(@Param('detalleId') id: string) {
    return this.service.registrarSesionUsada(+id);
  }

  @Patch(':id')
  @Auditable({ modulo: 'VENTAS', accion: 'ACTUALIZAR_VENTA_SERVICIO' })
  update(@Param('id') id: string, @Body() dto: UpdateVentaServicioDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @Auditable({ modulo: 'VENTAS', accion: 'ELIMINAR_VENTA_SERVICIO' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
