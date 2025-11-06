import { Controller, Post, Body, Get, Patch, Param, Query } from '@nestjs/common';
import { PacienteService } from './paciente.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { CreatePacienteCompletoDto } from './dto/create-paciente-completo.dto';
import { UpdateEstadoPacienteDto } from './dto/update-estado-paciente.dto';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('backend_api/pacientes')
export class PacienteController {
  constructor(private readonly pacienteService: PacienteService) {}

  @Post()
  create(@Body() dto: CreatePacienteDto) {
    return this.pacienteService.create(dto);
  }

  @Post('completo')
  createCompleto(@Body() dto: CreatePacienteCompletoDto) {
    return this.pacienteService.createCompleto(dto);
  }

  @Get()
  findAll(
    @Query('terapeutaId') terapeutaId?: string,
    @Query('numeroDocumento') numeroDocumento?: string,
    @Query('nombreCompleto') nombreCompleto?: string,
    @Query('distritoId') distritoId?: string,
    @Query('estadoId') estadoId?: string,
    @Query('servicioId') servicioId?: string,
  ) {
    const parsedFilters = {
      terapeutaId: terapeutaId && !isNaN(Number(terapeutaId)) ? parseInt(terapeutaId, 10) : undefined,
      numeroDocumento: numeroDocumento,
      nombre: nombreCompleto,
      distritoId: distritoId && !isNaN(Number(distritoId)) ? parseInt(distritoId, 10) : undefined,
      estadoId: estadoId && !isNaN(Number(estadoId)) ? parseInt(estadoId, 10) : undefined,
      servicioId: servicioId && !isNaN(Number(servicioId)) ? parseInt(servicioId, 10) : undefined,
    };
    
    return this.pacienteService.findAll(parsedFilters);
  }

   @Get('all')
@ApiOperation({ summary: 'Obtener todos los pacientes incluyendo activos e inactivos' })
@ApiQuery({ name: 'terapeutaId', required: false, type: Number })
@ApiQuery({ name: 'numeroDocumento', required: false, type: String })
@ApiQuery({ name: 'nombre', required: false, type: String })
@ApiQuery({ name: 'distritoId', required: false, type: Number })
@ApiQuery({ name: 'estadoId', required: false, type: Number })
@ApiQuery({ name: 'servicioId', required: false, type: Number })
@ApiQuery({ name: 'activo', required: false, type: Boolean, description: 'Filtrar por estado activo/inactivo' })
async findAllIncludingInactive(@Query() query: any) {
  const filters: any = {};

  // Validar que sean números válidos antes de convertir
  if (query.terapeutaId && !isNaN(Number(query.terapeutaId))) {
    filters.terapeutaId = Number(query.terapeutaId);
  }
  
  if (query.numeroDocumento) {
    filters.numeroDocumento = query.numeroDocumento;
  }
  
  if (query.nombre) {
    filters.nombre = query.nombre;
  }
  
  if (query.distritoId && !isNaN(Number(query.distritoId))) {
    filters.distritoId = Number(query.distritoId);
  }
  
  if (query.estadoId && !isNaN(Number(query.estadoId))) {
    filters.estadoId = Number(query.estadoId);
  }
  
  if (query.servicioId && !isNaN(Number(query.servicioId))) {
    filters.servicioId = Number(query.servicioId);
  }
  
  if (query.activo !== undefined && query.activo !== '') {
    filters.activo = query.activo === 'true' || query.activo === true;
  }

  return this.pacienteService.findAllIncludingInactive(filters);
}
  @Get('buscar')
  buscarPacientes(@Query('q') query: string) {
    // Validar que el parámetro q esté presente y sea válido
    if (!query || query === 'undefined' || query === 'null') {
      return [];
    }
    return this.pacienteService.buscarPacientes(query);
  }

  @Get('check-documento/:numeroDocumento')
  checkDocumentoExists(@Param('numeroDocumento') numeroDocumento: string) {
    return this.pacienteService.checkDocumentoExists(numeroDocumento);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePacienteDto) {
    return this.pacienteService.update(+id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pacienteService.findOneById(+id);
  }

  @Patch(':id/estado')
  updateEstado(@Param('id') id: string, @Body() dto: UpdateEstadoPacienteDto) {
    return this.pacienteService.updateEstado(+id, dto);
  }

  @Patch(':id/visibilidad')
  controlarVisibilidad(
    @Param('id') id: string, 
    @Body() dto: { mostrarEnListado: boolean; userId: number }
  ) {
    return this.pacienteService.controlarVisibilidad(+id, dto.mostrarEnListado, dto.userId);
  }

 
}