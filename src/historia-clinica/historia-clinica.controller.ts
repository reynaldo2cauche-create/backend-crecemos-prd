import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
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

@Controller('backend_api/historia-clinica')
export class HistoriaClinicaController {
  constructor(private readonly historiaClinicaService: HistoriaClinicaService) {}

  @Get('paciente/:id')
  getHistoriaClinica(@Param('id', ParseIntPipe) pacienteId: number) {
    return this.historiaClinicaService.getHistoriaClinica(pacienteId);
  }

  @Post('reporte-evolucion')
  createReporteEvolucion(@Body() createReporteDto: CreateReporteEvolucionDto): Promise<ReporteEvolucion> {
    return this.historiaClinicaService.createReporteEvolucion(createReporteDto);
  }

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

  @Put('reporte-evolucion/:id')
  updateReporteEvolucion(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReporteDto: UpdateReporteEvolucionDto
  ) {
    return this.historiaClinicaService.updateReporteEvolucion(id, updateReporteDto);
  }

    // ==================== EVALUACIONES DE TERAPIA OCUPACIONAL ====================
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

  @Put('evaluacion-terapia/:id')
  updateEvaluacionTerapia(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEvaluacionDto: UpdateEvaluacionTerapiaDto
  ): Promise<EvaluacionTerapiaOcupacional> {
    return this.historiaClinicaService.updateEvaluacionTerapia(id, updateEvaluacionDto);
  }
}
