import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CitasService } from './citas.service';
import { CrearCitaDto } from './dto/crear-cita.dto';

@Controller('backend_api/citas')
@UseGuards(JwtAuthGuard)
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  /**
   * GET /backend_api/citas/catalogos/motivos
   * Obtener todos los motivos de cita
   */
  @Get('catalogos/motivos')
  async getMotivosCita() {
    return this.citasService.getMotivosCita();
  }

  /**
   * GET /backend_api/citas/catalogos/estados
   * Obtener todos los estados de cita
   */
  @Get('catalogos/estados')
  async getEstadosCita() {
    return this.citasService.getEstadosCita();
  }

  /**
   * GET /backend_api/citas/catalogos/tipos
   * Obtener todos los tipos de cita
   */
  @Get('catalogos/tipos')
  async getTiposCita() {
    return this.citasService.getTiposCita();
  }

  /**
   * POST /backend_api/citas
   * Crear una nueva cita (detecta automáticamente el tipo)
   */
  @Post()
  async crear(@Body() dto: CrearCitaDto) {
    return this.citasService.crear(dto);
  }

  /**
   * GET /backend_api/citas
   * Listar todas las citas
   */
  @Get()
  async listar(@Query() filtros: any) {
    return this.citasService.listar(filtros);
  }

  /**
   * GET /backend_api/citas/:id
   * Obtener una cita por ID
   */
  @Get(':id')
  async obtenerPorId(@Param('id') id: number) {
    return this.citasService.obtenerPorId(id);
  }

  /**
   * DELETE /backend_api/citas/:id
   * Eliminar una cita
   */
  @Delete(':id')
  async eliminar(@Param('id') id: number) {
    return this.citasService.eliminar(id);
  }
}
