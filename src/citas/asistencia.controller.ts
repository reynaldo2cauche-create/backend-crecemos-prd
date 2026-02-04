import { Controller, Get, Post, Put, Body, Param, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AsistenciaService } from './asistencia.service';
import { RegistrarRecepcionDto, RegistrarTerapeutaDto } from './dto/registrar-asistencia.dto';

@Controller('backend_api/asistencia')
@UseGuards(JwtAuthGuard)
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  /**
   * Obtener seguimiento de asistencia de una cita
   * GET /backend_api/asistencia/seguimiento/:citaId
   */
  @Get('seguimiento/:citaId')
  async obtenerSeguimiento(@Param('citaId', ParseIntPipe) citaId: number) {
    console.log(`🔍 Obteniendo seguimiento de cita ID: ${citaId}`);
    return this.asistenciaService.obtenerSeguimiento(citaId);
  }

  /**
   * Registrar llegada del paciente (RECEPCIÓN)
   * POST /backend_api/asistencia/registrar-recepcion
   * Body: { cita_id, usuario_id, estado_id }
   */
  @Post('registrar-recepcion')
  async registrarRecepcion(@Body() dto: RegistrarRecepcionDto) {
    return this.asistenciaService.registrarRecepcion(dto);
  }

  /**
   * Registrar sesión completada (TERAPEUTA)
   * POST /backend_api/asistencia/registrar-terapeuta
   * Body: { cita_id, terapeuta_id, estado_id }
   */
  @Post('registrar-terapeuta')
  async registrarTerapeuta(@Body() dto: RegistrarTerapeutaDto) {
    return this.asistenciaService.registrarTerapeuta(dto);
  }

  /**
   * Obtener asistencias por terapeuta
   * GET /backend_api/asistencia/por-terapeuta/:terapeutaId?fecha_inicio=...&fecha_fin=...
   */
  @Get('por-terapeuta/:terapeutaId')
  async obtenerAsistenciasPorTerapeuta(
    @Param('terapeutaId', ParseIntPipe) terapeutaId: number,
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
  ) {
    return this.asistenciaService.obtenerAsistenciasPorTerapeuta(terapeutaId, fechaInicio, fechaFin);
  }

  /**
   * Obtener asistencias por paciente
   * GET /backend_api/asistencia/por-paciente/:pacienteId?fecha_inicio=...&fecha_fin=...
   */
  @Get('por-paciente/:pacienteId')
  async obtenerAsistenciasPorPaciente(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
  ) {
    return this.asistenciaService.obtenerAsistenciasPorPaciente(pacienteId, fechaInicio, fechaFin);
  }

  /**
   * Obtener inconsistencias de asistencia
   * GET /backend_api/asistencia/inconsistencias?fecha_inicio=...&fecha_fin=...
   */
  @Get('inconsistencias')
  async obtenerInconsistencias(
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
  ) {
    return this.asistenciaService.obtenerInconsistencias(fechaInicio, fechaFin);
  }

  /**
   * Obtener todas las asistencias para administrador
   * GET /backend_api/asistencia/admin/todas?fecha_inicio=...&fecha_fin=...
   */
  @Get('admin/todas')
  async obtenerTodasAsistencias(
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
  ) {
    return this.asistenciaService.obtenerTodasAsistencias(fechaInicio, fechaFin);
  }

  /**
   * Modificar estado de asistencia (SOLO ADMINISTRADOR)
   * PUT /backend_api/asistencia/admin/modificar/:citaId
   * Body: { recepcion_estado_id, terapeuta_estado_id, admin_usuario_id }
   */
  @Put('admin/modificar/:citaId')
  async modificarAsistenciaAdmin(
    @Param('citaId', ParseIntPipe) citaId: number,
    @Body() dto: { recepcion_estado_id?: number; terapeuta_estado_id?: number; admin_usuario_id: number },
  ) {
    return this.asistenciaService.modificarAsistenciaAdmin(citaId, dto);
  }
}
