import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';
import { CreateHistoriaClinicaDto } from './dto/create-historia-clinica.dto';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('historia-clinica')
@UseGuards(JwtAuthGuard)
export class HistoriaClinicaController {
  constructor(private readonly historiaClinicaService: HistoriaClinicaService) {}

  @Post()
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'CREAR_HISTORIA_CLINICA',
    entidadTipo: 'Paciente',
    entidadIdResponse: 'pacienteServicio.paciente.id',
  })
  create(@Body() createHistoriaClinicaDto: CreateHistoriaClinicaDto) {
    return this.historiaClinicaService.create(createHistoriaClinicaDto);
  }

  @Get()
  findAll() {
    return this.historiaClinicaService.findAll();
  }

  @Get('paciente-servicio/:id')
  findByPacienteServicio(@Param('id') id: string) {
    return this.historiaClinicaService.findByPacienteServicio(+id);
  }

  @Get('terapeuta/:id')
  findByTerapeuta(@Param('id') id: string) {
    return this.historiaClinicaService.findByTerapeuta(+id);
  }

  @Get('paciente/:id')
  findByPaciente(@Param('id') id: string) {
    return this.historiaClinicaService.findByPaciente(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.historiaClinicaService.findOne(+id);
  }

  @Patch(':id')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'EDITAR_HISTORIA_CLINICA',
    entidadTipo: 'Paciente',
    entidadIdResponse: 'pacienteServicio.paciente.id',
  })
  update(@Param('id') id: string, @Body() updateHistoriaClinicaDto: Partial<CreateHistoriaClinicaDto>) {
    return this.historiaClinicaService.update(+id, updateHistoriaClinicaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.historiaClinicaService.remove(+id);
  }
} 