import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { TrabajadorServicioService } from './trabajador-servicio.service';

@Controller('backend_api/trabajador-servicio')
export class TrabajadorServicioController {
  constructor(private readonly service: TrabajadorServicioService) {}

  /**
   * GET /backend_api/trabajador-servicio/por-servicio/:servicioId
   * Obtiene todos los trabajadores asignados a un servicio
   */
  @Get('por-servicio/:servicioId')
  getTrabajadoresByServicio(@Param('servicioId') servicioId: string) {
    return this.service.getTrabajadoresByServicio(+servicioId);
  }

  /**
   * GET /backend_api/trabajador-servicio/por-trabajador/:trabajadorId
   * Obtiene todos los servicios asignados a un trabajador
   */
  @Get('por-trabajador/:trabajadorId')
  getServiciosByTrabajador(@Param('trabajadorId') trabajadorId: string) {
    return this.service.getServiciosByTrabajador(+trabajadorId);
  }
  // ✅ AGREGAR ESTE ENDPOINT NUEVO
  @Get('activos')
  getStaffActivos() {
    return this.service.getStaffActivos();
  }
  /**
   * POST /backend_api/trabajador-servicio
   * Asignar un servicio a un trabajador
   */
  @Post()
  asignarServicio(
    @Body() data: { trabajadorId: number; servicioId: number; observaciones?: string; userId: number; validarPaciente?: boolean }
  ) {
    return this.service.asignarServicio(data.trabajadorId, data.servicioId, data.observaciones, data.userId, data.validarPaciente || false);
  }

  /**
   * DELETE /backend_api/trabajador-servicio/:trabajadorId/:servicioId
   * Desactivar un servicio de un trabajador
   */
  @Delete(':trabajadorId/:servicioId')
  desactivarServicio(
    @Param('trabajadorId') trabajadorId: string,
    @Param('servicioId') servicioId: string,
    @Body() data: { userId: number }
  ) {
    return this.service.desactivarServicio(+trabajadorId, +servicioId, data.userId);
  }
}
