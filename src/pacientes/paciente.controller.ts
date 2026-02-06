import { Controller, Post, Body, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { PacienteService } from './paciente.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { CreatePacienteCompletoDto } from './dto/create-paciente-completo.dto';
import { UpdateEstadoPacienteDto } from './dto/update-estado-paciente.dto';
import { ApiOperation, ApiQuery, ApiResponse,ApiParam } from '@nestjs/swagger';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { GeofencingGuard } from 'src/geofencing/geofencing.guard';
import { RequiereUbicacion } from 'src/geofencing/requiere-ubicacion.decorator';

@Controller('backend_api/pacientes')
@UseGuards(JwtAuthGuard, GeofencingGuard) 
export class PacienteController {
  constructor(private readonly pacienteService: PacienteService) {}


  @Public()
  @Post()
  create(@Body() dto: CreatePacienteDto) {
    return this.pacienteService.create(dto);
  }


  @Public()
  @Post('completo')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'CREAR_PACIENTE',
  })
  createCompleto(@Body() dto: CreatePacienteCompletoDto) {
    return this.pacienteService.createCompleto(dto);
  }

  @Get('estadisticas')
  @RequiereUbicacion()
  @ApiOperation({ summary: 'Obtener estadísticas de pacientes del mes actual' })
  getEstadisticas() {
    return this.pacienteService.getEstadisticasMesActual();
  }

  @Get()
  @RequiereUbicacion()
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
   @RequiereUbicacion()
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

  @Public()
  @Get('check-documento/:numeroDocumento')
  checkDocumentoExists(@Param('numeroDocumento') numeroDocumento: string) {
    return this.pacienteService.checkDocumentoExists(numeroDocumento);
  }
  
  @Public()
  @Get('beneficios/:numeroDocumento')
  @ApiOperation({
    summary: 'Verificar paciente y obtener beneficios disponibles',
    description: 'Valida que el paciente exista y esté activo, luego retorna los beneficios disponibles'
  })
  @ApiParam({
    name: 'numeroDocumento',
    description: 'Número de documento del paciente',
    example: '12345678'
  })
  @ApiResponse({
    status: 200,
    description: 'Paciente verificado y beneficios obtenidos exitosamente'
  })
  @ApiResponse({
    status: 404,
    description: 'Paciente no encontrado'
  })
  @ApiResponse({
    status: 403,
    description: 'Paciente inactivo, sin acceso a beneficios'
  })
  verificarYObtenerBeneficios(@Param('numeroDocumento') numeroDocumento: string) {
    return this.pacienteService.verificarPacienteYObtenerBeneficios(numeroDocumento);
  }

  @Patch(':id')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'EDITAR_PACIENTE',
  })
  update(@Param('id') id: string, @Body() dto: UpdatePacienteDto) {
    return this.pacienteService.update(+id, dto);
  }


  @Get(':id')
    @Auditable({
      modulo: 'PACIENTES',
      accion: 'VER_PACIENTE',
  })
  findOne(@Param('id') id: string) {
    return this.pacienteService.findOneById(+id);
  }

  @Patch(':id/estado')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'CAMBIAR_ESTADO_PACIENTE',
  })
  updateEstado(@Param('id') id: string, @Body() dto: UpdateEstadoPacienteDto) {
    return this.pacienteService.updateEstado(+id, dto);
  }

  @Patch(':id/visibilidad')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'CAMBIAR_VISIBILIDAD_PACIENTE',
  })
  controlarVisibilidad(
    @Param('id') id: string,
    @Body() dto: { mostrarEnListado: boolean; userId: number }
  ) {
    return this.pacienteService.controlarVisibilidad(+id, dto.mostrarEnListado, dto.userId);
  }

 
}