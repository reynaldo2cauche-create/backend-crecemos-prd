import { Controller, Get, Param, ParseIntPipe, Post, Body, Query, Delete } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import { ResultadosTest } from './resultados-test.entity';
import { DatosEstudiante } from './datos-estudiante.entity';

@Controller('backend_api/evaluaciones')
export class EvaluacionesController {
  constructor(private readonly evaluacionesService: EvaluacionesService) {}

  @Get('estructura-test/:tipo_test_id')
  getEstructuraTest(@Param('tipo_test_id', ParseIntPipe) tipo_test_id: number) {
    return this.evaluacionesService.getEstructuraTest(tipo_test_id);
  }

  @Post('guardar-resultado')
  guardarResultado(@Body() data: { resultados: Partial<ResultadosTest>[], estudiante: Partial<DatosEstudiante> }) {
    return this.evaluacionesService.guardarResultadoTest(data);
  }

  @Get('tabla-alumnos-evaluados/:tipo_test_id')
  async getTablaAlumnosEvaluados(
    @Param('tipo_test_id') tipo_test_id: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('estudianteId') estudianteId?: string,
    @Query('gradoId') gradoId?: string,
    @Query('seccionId') seccionId?: string,
    @Query('colegioId') colegioId?: string,
  ) {
    const tipoTestId = parseInt(tipo_test_id, 10);
    const estudianteIdNum = estudianteId ? parseInt(estudianteId, 10) : undefined;
    const gradoIdNum = gradoId ? parseInt(gradoId, 10) : undefined;
    const seccionIdNum = seccionId ? parseInt(seccionId, 10) : undefined;
    const colegioIdNum = colegioId ? parseInt(colegioId, 10) : undefined;

    if (isNaN(tipoTestId)) {
      throw new Error('tipo_test_id debe ser un número válido');
    }

    return this.evaluacionesService.getTablaAlumnosEvaluados(
      tipoTestId,
      fechaInicio,
      fechaFin,
      estudianteIdNum,
      gradoIdNum,
      seccionIdNum,
      colegioIdNum
    );
  }

  @Delete('eliminar-evaluacion/:estudianteId/:tipoTestId')
  async eliminarEvaluacion(
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Param('tipoTestId', ParseIntPipe) tipoTestId: number
  ) {
    return this.evaluacionesService.eliminarEvaluacion(estudianteId, tipoTestId);
  }
} 