import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AsignacionTerapeutaService } from './asignacion-terapeuta.service';
import { CreateAsignacionTerapeutaDto } from './dto/create-asignacion-terapeuta.dto';
import { AsignarTerapeutaDto } from './dto/asignar-terapeuta.dto';

@Controller('backend_api/asignacion-terapeuta')
export class AsignacionTerapeutaController {
  constructor(private readonly asignacionTerapeutaService: AsignacionTerapeutaService) {}

  @Post()
  create(@Body() createAsignacionTerapeutaDto: CreateAsignacionTerapeutaDto) {
    return this.asignacionTerapeutaService.create(createAsignacionTerapeutaDto);
  }

  @Post('asignar')
  asignarTerapeuta(@Body() dto: AsignarTerapeutaDto) {
    return this.asignacionTerapeutaService.asignarTerapeuta(dto);
  }

  @Get()
  findAll() {
    return this.asignacionTerapeutaService.findAll();
  }

  @Get('terapeuta/:id')
  findByTerapeuta(@Param('id') id: string) {
    return this.asignacionTerapeutaService.findByTerapeuta(+id);
  }

  @Get('paciente-servicio/:id')
  findByPacienteServicio(@Param('id') id: string) {
    return this.asignacionTerapeutaService.findByPacienteServicio(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.asignacionTerapeutaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAsignacionTerapeutaDto: Partial<CreateAsignacionTerapeutaDto>) {
    return this.asignacionTerapeutaService.update(+id, updateAsignacionTerapeutaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.asignacionTerapeutaService.remove(+id);
  }
} 