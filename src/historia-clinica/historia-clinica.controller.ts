import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';
import { CreateReporteEvolucionDto } from './dto/create-reporte-evolucion.dto';
import { CreateEntrevistaPadresDto } from './dto/create-entrevista-padres.dto';
import { UpdateEntrevistaPadresDto } from './dto/update-entrevista-padres.dto';
import { UpdateReporteEvolucionDto } from './dto/update-reporte-evolucion.dto';
import { ReporteEvolucion } from './entities/reporte-evolucion.entity';
import { EntrevistaPadres } from './entities/entrevista-padres.entity';
import { CreateEvaluacionTerapiaDto } from './dto/create-evaluacion-terapia.dto';
import { EvaluacionTerapiaOcupacional } from './entities/evaluacion-terapia-ocupacional.entity';
import { UpdateEvaluacionTerapiaDto } from './dto/update-evaluacion-terapia.dto';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('backend_api/historia-clinica')
@UseGuards(JwtAuthGuard)
export class HistoriaClinicaController {
  constructor(private readonly historiaClinicaService: HistoriaClinicaService) {}

  @Get('paciente/:id')
  getHistoriaClinica(@Param('id', ParseIntPipe) pacienteId: number) {
    return this.historiaClinicaService.getHistoriaClinica(pacienteId);
  }

  @Auditable({
      modulo: 'HISTORIA_CLINICA',
      accion: 'CREAR_REPORTE_EVOLUCION',
      entidadTipo: 'Paciente',
      entidadIdBody: 'paciente_id',  // 🎯 Toma el ID del paciente, no del reporte creado
    })
  @Post('reporte-evolucion')
  createReporteEvolucion(@Body() createReporteDto: CreateReporteEvolucionDto): Promise<ReporteEvolucion> {
    return this.historiaClinicaService.createReporteEvolucion(createReporteDto);
  }

  @Auditable({
    modulo: 'HISTORIA_CLINICA',
    accion: 'CREAR_ENTREVISTA_PADRES',
    entidadTipo: 'Paciente',
    entidadIdBody: 'paciente_id',  // 🎯 Toma el ID del paciente del body
  })
  @Post('entrevista-padres')
  createEntrevistaPadres(@Body() createEntrevistaDto: CreateEntrevistaPadresDto): Promise<EntrevistaPadres> {
    return this.historiaClinicaService.createEntrevistaPadres(createEntrevistaDto);
  }

  @Get('paciente/:id/entrevistas-padres')
  getEntrevistasPadres(@Param('id', ParseIntPipe) pacienteId: number): Promise<EntrevistaPadres[]> {
    return this.historiaClinicaService.getEntrevistasPadres(pacienteId);
  }

  @Get('entrevista-padres/:id')
  getEntrevistaPadresById(@Param('id', ParseIntPipe) id: number): Promise<EntrevistaPadres> {
    return this.historiaClinicaService.getEntrevistaPadresById(id);
  }

  @Auditable({
    modulo: 'HISTORIA_CLINICA',
    accion: 'EDITAR_ENTREVISTA_PADRES',
    entidadTipo: 'Paciente',
    entidadIdResponse: 'pacienteId',  // 🎯 Toma el ID del paciente de la respuesta
  })
  @Put('entrevista-padres/:id')
  updateEntrevistaPadres(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEntrevistaDto: UpdateEntrevistaPadresDto
  ): Promise<EntrevistaPadres> {
    return this.historiaClinicaService.updateEntrevistaPadres(id, updateEntrevistaDto);
  }

  @Get('reporte-evolucion/:id')
  getReporteEvolucionById(@Param('id', ParseIntPipe) id: number) {
    return this.historiaClinicaService.getReporteEvolucionById(id);
  }

  @Auditable({
    modulo: 'HISTORIA_CLINICA',
    accion: 'EDITAR_REPORTE_EVOLUCION',
    entidadTipo: 'Paciente',
    entidadIdResponse: 'pacienteId',  // 🎯 Toma el ID del paciente de la respuesta
  })
  @Put('reporte-evolucion/:id')
  updateReporteEvolucion(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReporteDto: UpdateReporteEvolucionDto
  ) {
    return this.historiaClinicaService.updateReporteEvolucion(id, updateReporteDto);
  }

    // ==================== EVALUACIONES DE TERAPIA OCUPACIONAL ====================
  @Auditable({
    modulo: 'HISTORIA_CLINICA',
    accion: 'CREAR_EVALUACION_TERAPIA',
    entidadTipo: 'Paciente',
    entidadIdBody: 'paciente_id',  // 🎯 Toma el ID del paciente del body
  })
  @Post('evaluacion-terapia')
  createEvaluacionTerapia(@Body() createEvaluacionDto: CreateEvaluacionTerapiaDto): Promise<EvaluacionTerapiaOcupacional> {
    return this.historiaClinicaService.createEvaluacionTerapia(createEvaluacionDto);
  }

  @Get('paciente/:id/evaluaciones-terapia')
  getEvaluacionesTerapia(@Param('id', ParseIntPipe) pacienteId: number): Promise<EvaluacionTerapiaOcupacional[]> {
    return this.historiaClinicaService.getEvaluacionesTerapia(pacienteId);
  }

  @Get('evaluacion-terapia/:id')
  getEvaluacionTerapiaById(@Param('id', ParseIntPipe) id: number): Promise<EvaluacionTerapiaOcupacional> {
    return this.historiaClinicaService.getEvaluacionTerapiaById(id);
  }

  @Auditable({
    modulo: 'HISTORIA_CLINICA',
    accion: 'EDITAR_EVALUACION_TERAPIA',
    entidadTipo: 'Paciente',
    entidadIdResponse: 'pacienteId',  // 🎯 Toma el ID del paciente de la respuesta
  })
  @Put('evaluacion-terapia/:id')
  updateEvaluacionTerapia(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEvaluacionDto: UpdateEvaluacionTerapiaDto
  ): Promise<EvaluacionTerapiaOcupacional> {
    return this.historiaClinicaService.updateEvaluacionTerapia(id, updateEvaluacionDto);
  }
}
