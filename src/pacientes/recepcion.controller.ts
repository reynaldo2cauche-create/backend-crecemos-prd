import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PacienteServicioService } from './paciente-servicio.service';
import { AsignacionTerapeutaService } from './asignacion-terapeuta.service';
import { PacienteService } from './paciente.service';
import { CreatePacienteServicioDto } from './dto/create-paciente-servicio.dto';
import { CreateAsignacionTerapeutaDto } from './dto/create-asignacion-terapeuta.dto';

@Controller('recepcion')
export class RecepcionController {
  constructor(
    private readonly pacienteServicioService: PacienteServicioService,
    private readonly asignacionTerapeutaService: AsignacionTerapeutaService,
    private readonly pacienteService: PacienteService,
  ) {}

  // Asignar servicio a paciente
  @Post('asignar-servicio')
  async asignarServicio(@Body() createPacienteServicioDto: CreatePacienteServicioDto) {
    return this.pacienteServicioService.create(createPacienteServicioDto);
  }

  // Asignar terapeuta a un servicio específico del paciente
  @Post('asignar-terapeuta')
  async asignarTerapeuta(@Body() createAsignacionTerapeutaDto: CreateAsignacionTerapeutaDto) {
    return this.asignacionTerapeutaService.create(createAsignacionTerapeutaDto);
  }

  // Obtener todos los servicios de un paciente
  @Get('paciente/:id/servicios')
  async getServiciosPaciente(@Param('id') id: string) {
    return this.pacienteServicioService.findByPaciente(+id);
  }

  // Obtener pacientes por servicio
  @Get('servicio/:id/pacientes')
  async getPacientesPorServicio(@Param('id') id: string) {
    return this.pacienteServicioService.findByServicio(+id);
  }

  // Obtener asignaciones de un terapeuta
  @Get('terapeuta/:id/asignaciones')
  async getAsignacionesTerapeuta(@Param('id') id: string) {
    return this.asignacionTerapeutaService.findByTerapeuta(+id);
  }

  // Buscar paciente por documento
  @Get('buscar-paciente')
  async buscarPaciente(@Query('documento') documento: string) {
    return this.pacienteService.findByDocumento(documento);
  }

  // Obtener resumen de asignaciones activas
  @Get('resumen-asignaciones')
  async getResumenAsignaciones() {
    const asignaciones = await this.asignacionTerapeutaService.findAll();
    return asignaciones.filter(a => a.estado === 'ACTIVO');
  }

  // Obtener bandeja de terapeuta (pacientes asignados con sus servicios)
  @Get('bandeja-terapeuta/:id')
  async getBandejaTerapeuta(@Param('id') id: string) {
    const asignaciones = await this.asignacionTerapeutaService.findByTerapeuta(+id);
    
    // Agrupar por paciente y servicio
    const bandeja = asignaciones.map(asignacion => ({
      paciente: asignacion.pacienteServicio.paciente,
      servicio: asignacion.pacienteServicio.servicio,
      pacienteServicio: asignacion.pacienteServicio,
      asignacion: asignacion
    }));

    return bandeja;
  }
} 