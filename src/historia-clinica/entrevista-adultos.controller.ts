import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntrevistaAdultosService } from './entrevista-adultos.service';
import { CreateEntrevistaAdultosDto } from './dto/create-entrevista-adultos.dto';
import { UpdateEntrevistaAdultosDto } from './dto/update-entrevista-adultos.dto';

@Controller('backend_api/entrevistas-adultos')
@UseGuards(JwtAuthGuard)
export class EntrevistaAdultosController {
  constructor(private readonly entrevistaAdultosService: EntrevistaAdultosService) {}

  /**
   * Crear una nueva entrevista de adultos
   * POST /backend_api/entrevistas-adultos
   */
  @Post()
  async create(@Body() dto: CreateEntrevistaAdultosDto) {
    console.log('➡️ POST /backend_api/entrevistas-adultos');
    return this.entrevistaAdultosService.create(dto);
  }

  /**
   * Obtener todas las entrevistas de un paciente
   * GET /backend_api/entrevistas-adultos/paciente/:pacienteId
   */
  @Get('paciente/:pacienteId')
  async findByPaciente(@Param('pacienteId', ParseIntPipe) pacienteId: number) {
    console.log(`➡️ GET /backend_api/entrevistas-adultos/paciente/${pacienteId}`);
    return this.entrevistaAdultosService.findByPaciente(pacienteId);
  }

  /**
   * Obtener la última entrevista de un paciente
   * GET /backend_api/entrevistas-adultos/paciente/:pacienteId/ultima
   */
  @Get('paciente/:pacienteId/ultima')
  async findUltimaPorPaciente(@Param('pacienteId', ParseIntPipe) pacienteId: number) {
    console.log(`➡️ GET /backend_api/entrevistas-adultos/paciente/${pacienteId}/ultima`);
    return this.entrevistaAdultosService.findUltimaPorPaciente(pacienteId);
  }

  /**
   * Obtener una entrevista por ID
   * GET /backend_api/entrevistas-adultos/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    console.log(`➡️ GET /backend_api/entrevistas-adultos/${id}`);
    return this.entrevistaAdultosService.findOne(id);
  }

  /**
   * Actualizar una entrevista
   * PUT /backend_api/entrevistas-adultos/:id
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEntrevistaAdultosDto,
  ) {
    console.log(`➡️ PUT /backend_api/entrevistas-adultos/${id}`);
    return this.entrevistaAdultosService.update(id, dto);
  }

  /**
   * Eliminar una entrevista
   * DELETE /backend_api/entrevistas-adultos/:id
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    console.log(`➡️ DELETE /backend_api/entrevistas-adultos/${id}`);
    await this.entrevistaAdultosService.remove(id);
    return { message: 'Entrevista eliminada exitosamente' };
  }
}
