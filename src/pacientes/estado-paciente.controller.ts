import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EstadoPacienteService } from './estado-paciente.service';

@Controller('backend_api/estados-paciente')
export class EstadoPacienteController {
  constructor(private readonly estadoPacienteService: EstadoPacienteService) {}

  @Get()
  findAll() {
    return this.estadoPacienteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estadoPacienteService.findOne(+id);
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