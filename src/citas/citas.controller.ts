import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Put, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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

  // ✅ RUTAS ESPECÍFICAS PRIMERO
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
  async crear(@Body() dto: CrearCitaDto) {
    return this.citasService.crear(dto);
  }


  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: CrearCitaDto
  ): Promise<any> {
    return this.citasService.actualizar(+id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  async eliminar(
    @Param('id') id: string,
    @Body() body: { usuario_id: number; motivo_accion: string }
  ) {
    return this.citasService.eliminar(+id, body.usuario_id, body.motivo_accion);
  }
}