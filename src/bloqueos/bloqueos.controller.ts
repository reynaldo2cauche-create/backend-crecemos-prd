import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { BloqueosService } from './bloqueos.service';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
import { UpdateBloqueoDto } from './dto/update-bloqueo.dto';
import { VerificarBloqueoDto } from './dto/verificar-bloqueo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Auditable } from '../auditoria/decorators/auditable.decorator';

@Controller('backend_api/bloqueos')
@UseGuards(JwtAuthGuard)
export class BloqueosController {
  constructor(private readonly bloqueosService: BloqueosService) {}

  @Auditable({ modulo: 'BLOQUEOS', accion: 'CREAR_BLOQUEO' })
  @Post()
  async create(@Body() createBloqueoDto: CreateBloqueoDto, @Request() req) {
    // El usuario responsable se toma del token (no del cliente) para que la auditoría sea confiable
    createBloqueoDto.userIdCrea = req.user?.id ?? createBloqueoDto.userIdCrea;
    return await this.bloqueosService.create(createBloqueoDto);
  }

  @Get()
  async findAll() {
    return await this.bloqueosService.findAll();
  }

  @Get('activos')
  async findActivos() {
    return await this.bloqueosService.findActivos();
  }

  @Get('trabajador/:trabajadorId')
  async findByTrabajador(@Param('trabajadorId', ParseIntPipe) trabajadorId: number) {
    return await this.bloqueosService.findByTrabajador(trabajadorId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.bloqueosService.findOne(id);
  }

  @Auditable({ modulo: 'BLOQUEOS', accion: 'EDITAR_BLOQUEO' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBloqueoDto: UpdateBloqueoDto,
  ) {
    return await this.bloqueosService.update(id, updateBloqueoDto);
  }

  @Auditable({ modulo: 'BLOQUEOS', accion: 'ELIMINAR_BLOQUEO' })
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body('motivoEliminacion') motivoEliminacion?: string,
  ) {
    // Usuario responsable desde el token; motivo de eliminación desde el body
    const userId = req.user?.id;
    return await this.bloqueosService.delete(id, userId, motivoEliminacion);
  }

  @Post('verificar')
  async verificarBloqueado(@Body() verificarDto: VerificarBloqueoDto) {
    const bloqueado = await this.bloqueosService.verificarBloqueado(verificarDto);
    return { bloqueado };
  }

  @Get('disponibles/:trabajadorId')
  async obtenerHorariosDisponibles(
    @Param('trabajadorId', ParseIntPipe) trabajadorId: number,
    @Query('fecha') fecha: string,
    @Query('horaInicio') horaInicio?: string,
    @Query('horaFin') horaFin?: string,
    @Query('intervalo', ParseIntPipe) intervalo?: number,
  ) {
    const horarios = await this.bloqueosService.obtenerHorariosDisponibles(
      trabajadorId,
      fecha,
      horaInicio,
      horaFin,
      intervalo,
    );
    return { horarios };
  }
}
