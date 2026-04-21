import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { BloqueosService } from './bloqueos.service';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
import { UpdateBloqueoDto } from './dto/update-bloqueo.dto';
import { VerificarBloqueoDto } from './dto/verificar-bloqueo.dto';

@Controller('backend_api/bloqueos')
export class BloqueosController {
  constructor(private readonly bloqueosService: BloqueosService) {}

  @Post()
  async create(@Body() createBloqueoDto: CreateBloqueoDto) {
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

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBloqueoDto: UpdateBloqueoDto,
  ) {
    return await this.bloqueosService.update(id, updateBloqueoDto);
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId', ParseIntPipe) userId?: number,
  ) {
    return await this.bloqueosService.delete(id, userId);
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
