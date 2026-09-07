import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FaltasService } from './faltas.service';
import { CrearFaltaDto } from './dto/crear-falta.dto';
import { ActualizarFaltaDto } from './dto/actualizar-falta.dto';
import { CrearTipoFaltaDto, ActualizarTipoFaltaDto } from './dto/tipo-falta.dto';

@Controller('backend_api/faltas')
export class FaltasController {
  constructor(private readonly faltasService: FaltasService) {}

  /** GET /faltas/tipos — catálogo de tipos de falta activos. Antes de :id. */
  @Get('tipos')
  getTipos() {
    return this.faltasService.getTipos();
  }

  /** GET /faltas/tipos/all — todos los tipos (incluye inactivos) para configuración. */
  @Get('tipos/all')
  getTiposAll() {
    return this.faltasService.getTiposAll();
  }

  @Post('tipos')
  crearTipo(@Body() dto: CrearTipoFaltaDto) {
    return this.faltasService.crearTipo(dto);
  }

  @Patch('tipos/:id')
  actualizarTipo(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarTipoFaltaDto) {
    return this.faltasService.actualizarTipo(id, dto);
  }

  @Post()
  crear(@Body() dto: CrearFaltaDto) {
    return this.faltasService.crear(dto);
  }

  @Get()
  findAll(
    @Query('empleadoId') empleadoId?: string,
    @Query('mesId') mesId?: string,
    @Query('anio') anio?: string,
  ) {
    return this.faltasService.findAll(
      empleadoId ? parseInt(empleadoId) : undefined,
      mesId ? parseInt(mesId) : undefined,
      anio ? parseInt(anio) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.faltasService.findOne(id);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarFaltaDto) {
    return this.faltasService.actualizar(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.faltasService.remove(id);
    return { message: 'Falta eliminada correctamente' };
  }
}
