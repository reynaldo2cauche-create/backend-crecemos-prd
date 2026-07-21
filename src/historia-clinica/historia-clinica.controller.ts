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
import { GeofencingGuard } from 'src/geofencing/geofencing.guard';
import { RequiereUbicacion } from 'src/geofencing/requiere-ubicacion.decorator';

@Controller('backend_api/historia-clinica')
@UseGuards(JwtAuthGuard, GeofencingGuard)
@RequiereUbicacion()
export class HistoriaClinicaController {
  constructor(private readonly historiaClinicaService: HistoriaClinicaService) {}

  @Get('paciente/:id')
  getHistoriaClinica(@Param('id', ParseIntPipe) pacienteId: number) {
    return this.historiaClinicaService.getHistoriaClinica(pacienteId);
  }

  @Auditable({
      modulo: 'HISTORIA_CLINICA',
      accion: 'CREAR_REPORTE_EVOLUCION',
    })
  @Post('reporte-evolucion')
  createReporteEvolucion(@Body() createReporteDto: CreateReporteEvolucionDto): Promise<ReporteEvolucion> {
    return this.historiaClinicaService.createReporteEvolucion(createReporteDto);
  }

  @Auditable({
    modulo: 'HISTORIA_CLINICA',
    accion: 'CREAR_ENTREVISTA_PADRES',
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
  })
  @Put('evaluacion-terapia/:id')
  updateEvaluacionTerapia(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEvaluacionDto: UpdateEvaluacionTerapiaDto
  ): Promise<EvaluacionTerapiaOcupacional> {
    return this.historiaClinicaService.updateEvaluacionTerapia(id, updateEvaluacionDto);
  }
}
