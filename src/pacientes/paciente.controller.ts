import { Controller, Post, Body, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PacienteService } from './paciente.service';
import { AsignacionTerapeutaService } from './asignacion-terapeuta.service';
import { PacientesInactivosScheduler } from './pacientes-inactivos.task';
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
  constructor(
    private readonly pacienteService: PacienteService,
    private readonly asignacionTerapeutaService: AsignacionTerapeutaService,
    private readonly pacientesInactivosScheduler: PacientesInactivosScheduler,
  ) {}


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
  async findAll(
    @Query('terapeutaId') terapeutaId?: string,
    @Query('soloPropio') soloPropio?: string,
    @Query('numeroDocumento') numeroDocumento?: string,
    @Query('nombreCompleto') nombreCompleto?: string,
    @Query('distritoId') distritoId?: string,
    @Query('estadoId') estadoId?: string,
    @Query('servicioId') servicioId?: string,
  ) {
    const parsedTerapeutaId = terapeutaId && !isNaN(Number(terapeutaId))
      ? parseInt(terapeutaId, 10)
      : undefined;

    // Si viene terapeutaId y NO es soloPropio, verificar si es jefe y expandir a subordinados
    let terapeutaIds: number[] | undefined;
    if (parsedTerapeutaId && soloPropio !== 'true') {
      const subordinadosIds = await this.asignacionTerapeutaService.getSubordinadosIds(parsedTerapeutaId);
      if (subordinadosIds.length > 0) {
        // Es jefe vista completa: incluir al propio jefe + todos sus subordinados
        terapeutaIds = [parsedTerapeutaId, ...subordinadosIds];
      }
    }

    const parsedFilters = {
      terapeutaId: terapeutaIds ? undefined : parsedTerapeutaId,
      terapeutaIds: terapeutaIds,
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

  /**
   * Endpoint para forzar manualmente la actualización de pacientes inactivos
   * POST /backend_api/pacientes/actualizar-inactivos
   * ⚠️ Solo accesible para administradores
   */
  @Post('actualizar-inactivos')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'ACTUALIZAR_PACIENTES_INACTIVOS',
  })
  async actualizarPacientesInactivos(@Request() req) {
    const rolId = req.user?.rol?.id;
    const usuarioId = req.user?.id;

    // Verificar que sea administrador (rol_id = 1)
    if (!rolId || rolId !== 1) {
      return {
        success: false,
        message: 'No tienes permisos para ejecutar esta acción. Solo administradores.',
      };
    }

    try {
      console.log('🧪 Ejecutando actualización manual de pacientes inactivos...');

      const resultado = await this.pacientesInactivosScheduler.ejecutarActualizacionAutomatica();

      return {
        success: true,
        message: 'Actualización de pacientes inactivos ejecutada manualmente',
        actualizados: resultado.actualizados,
        pacientes_ids: resultado.pacientesIds,
        detalles: resultado.detalles,
        ejecutado_por: usuarioId,
        fecha: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error al actualizar pacientes inactivos:', error);
      return {
        success: false,
        message: 'Error al actualizar pacientes inactivos',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}