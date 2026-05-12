import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EstadoPacienteService } from './estado-paciente.service';
import { PacienteService } from './paciente.service';

@Controller('backend_api/estados-paciente')
export class EstadoPacienteController {
  constructor(
    private readonly estadoPacienteService: EstadoPacienteService,
    private readonly pacienteService: PacienteService,
  ) {}

  @Get()
  findAll() {
    return this.estadoPacienteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estadoPacienteService.findOne(+id);
  }

  @Post('migrar-desde-citas')
  migrarDesideCitas() {
    return this.pacienteService.migrarEstadosPorCitas();
  }

  @Post()
  create(@Body('nombre') nombre: string) {
    return this.estadoPacienteService.create(nombre);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body('nombre') nombre: string) {
    return this.estadoPacienteService.update(+id, nombre);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.estadoPacienteService.remove(+id);
  }
} 