import { Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { VacacionesService } from './vacaciones.service';
import { RegistrarVacacionDto } from './dto/registrar-vacacion.dto';
import { CalcularVacacionesDto } from './dto/calcular-vacaciones.dto';

@Controller('backend_api/vacaciones')
export class VacacionesController {
  constructor(private readonly vacacionesService: VacacionesService) {}

  /**
   * POST /vacaciones/calcular
   * Calcula las vacaciones disponibles para todos los empleados
   */
  @Post('calcular')
  async calcularVacaciones(@Body() dto: CalcularVacacionesDto) {
    return await this.vacacionesService.calcularVacacionesDisponibles(dto);
  }

  /**
   * POST /vacaciones
   * Registra una nueva vacación
   */
  @Post()
  async registrarVacacion(@Body() dto: RegistrarVacacionDto) {
    return await this.vacacionesService.registrarVacacion(dto);
  }

  /**
   * GET /vacaciones/notificaciones
   * Obtiene notificaciones de vacaciones próximas
   * IMPORTANTE: Debe estar ANTES de las rutas con :id para evitar conflictos
   */
  @Get('notificaciones')
  async obtenerNotificaciones() {
    return await this.vacacionesService.obtenerNotificacionesVacaciones();
  }

  /**
   * GET /vacaciones
   * Obtiene todas las vacaciones con filtros opcionales
   */
  @Get()
  async findAll(
    @Query('empleadoId') empleadoId?: string,
    @Query('anio') anio?: string,
  ) {
    return await this.vacacionesService.findAll(
      empleadoId ? parseInt(empleadoId) : undefined,
      anio ? parseInt(anio) : undefined,
    );
  }

  /**
   * GET /vacaciones/:id
   * Obtiene una vacación por ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.vacacionesService.findOne(id);
  }

  /**
   * DELETE /vacaciones/:id
   * DESHABILITADO: No se permite eliminar vacaciones registradas
   */
  // @Delete(':id')
  // async remove(@Param('id', ParseIntPipe) id: number) {
  //   await this.vacacionesService.remove(id);
  //   return { message: 'Vacación eliminada correctamente' };
  // }

  // En vacaciones.controller.ts - agregar esta ruta
@Get('alertas/primer-anio')
async obtenerAlertasPrimerAnio() {
  return await this.vacacionesService.obtenerEmpleadosProximosPrimerAnio();
}
}
