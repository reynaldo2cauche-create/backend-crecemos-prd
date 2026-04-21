import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Put, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Auditable } from '../auditoria/decorators/auditable.decorator';
import { CitasService } from './citas.service';
import { HistorialCitasService } from './historial-citas.service';
import { CrearCitaDto } from './dto/crear-cita.dto';

@Controller('backend_api/citas')
@UseGuards(JwtAuthGuard)
export class CitasController {
  constructor(
    private readonly citasService: CitasService,
    private readonly historialService: HistorialCitasService,

  ) {}


  @Get('catalogos/motivos')
  async getMotivosCita() {
    return this.citasService.getMotivosCita();
  }

  @Get('catalogos/estados')
  async getEstadosCita() {
    return this.citasService.getEstadosCita();
  }

  @Get('catalogos/tipos')
  async getTiposCita() {
    return this.citasService.getTiposCita();
  }

@Get('estadisticas')
async obtenerEstadisticas(@Query() query: any) {
  const { fecha_desde, fecha_hasta, terapeuta_id, fecha_referencia } = query;
  return this.citasService.obtenerEstadisticas(
    fecha_desde,
    fecha_hasta,
    terapeuta_id ? +terapeuta_id : undefined,
    fecha_referencia
  );
}

@Get('estadisticas/sesiones')
async obtenerEstadisticasSesiones(@Query() query: any) {
  const { fecha_desde, fecha_hasta, terapeuta_id, paciente_id } = query;
  return this.citasService.obtenerEstadisticasSesiones(
    fecha_desde,
    fecha_hasta,
    terapeuta_id ? +terapeuta_id : undefined,
    paciente_id ? +paciente_id : undefined
  );
}



  // 🛒 OBTENER VENTAS DISPONIBLES DEL PACIENTE
  @Get('ventas-disponibles/:paciente_id')
  async obtenerVentasDisponibles(
    @Param('paciente_id') paciente_id: string,
    @Query('servicio_id') servicio_id?: string,
    @Query('motivo_cita_id') motivo_cita_id?: string,
  ) {
    console.log(`🛒 Obteniendo ventas disponibles para paciente ${paciente_id}, servicio ${servicio_id || 'todos'}, motivo ${motivo_cita_id || 'todos'}`);
    return this.citasService.obtenerPaqueteActivoPaciente(
      +paciente_id,
      servicio_id ? +servicio_id : undefined,
      motivo_cita_id ? +motivo_cita_id : undefined
    );
  }

  // 📋 OBTENER LISTADO DETALLADO DE CITAS POR PACIENTE
  @Get('listado-citas/:paciente_id')
  async obtenerListadoCitas(@Param('paciente_id') paciente_id: string) {
    console.log(`📋 Obteniendo listado de citas para paciente ${paciente_id}`);
    return this.citasService.obtenerListadoCitasPorPaciente(+paciente_id);
  }

  // 📊 OBTENER RESUMEN DE TERAPIAS POR PACIENTE
  @Get('resumen-terapias/:paciente_id')
  async obtenerResumenTerapias(@Param('paciente_id') paciente_id: string) {
    console.log(`📊 Obteniendo resumen de terapias para paciente ${paciente_id}`);
    return this.citasService.obtenerResumenTerapiasPorPaciente(+paciente_id);
  }



  @Get(':id/info-venta')
    async obtenerInfoVenta(@Param('id') id: string) {
      return this.citasService.obtenerInfoVentaDeCita(+id);
    }
    
  // ✅ RUTAS CON PARÁMETROS AL FINAL
  @Get(':id/historial')
  async obtenerHistorial(@Param('id') id: string) {
    console.log(`🔍 Obteniendo historial de cita ID: ${id}`);
    return this.historialService.obtenerHistorial(+id);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    console.log(`🔍 Obteniendo cita ID: ${id}`);
    return this.citasService.obtenerPorId(+id);
  }

  // ✅ GET sin parámetros va antes de GET con parámetros
  @Get()
  async listar(@Query() filtros: any) {
    return this.citasService.listar(filtros);
  }
  @Post('multiples')
  async crearMultiples(@Body() body: { citas: CrearCitaDto[] }) {
    console.log(`📝 Solicitud de crear ${body.citas?.length || 0} citas`);
    
    if (!body.citas || !Array.isArray(body.citas) || body.citas.length === 0) {
      throw new BadRequestException('Debe enviar un array de citas');
    }
    
    return this.citasService.crearMultiples(body.citas);
  }
  @Post()
  @Auditable({
    modulo: 'CITAS',
    accion: 'CREAR_CITA'
  })
  async crear(@Body() dto: CrearCitaDto) {
    return this.citasService.crear(dto);
  }


  @Put(':id')
  @Auditable({
    modulo: 'CITAS',
    accion: 'EDITAR_CITA'
  })
  async actualizar(
    @Param('id') id: string,
    @Body() dto: CrearCitaDto
  ): Promise<any> {
    return this.citasService.actualizar(+id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  @Auditable({
    modulo: 'CITAS',
    accion: 'ELIMINAR_CITA'
  })
  async eliminar(
    @Param('id') id: string,
    @Body() body: { usuario_id: number; motivo_accion: string }
  ) {
    return this.citasService.eliminar(+id, body.usuario_id, body.motivo_accion);
  }

  // ==========================================
}