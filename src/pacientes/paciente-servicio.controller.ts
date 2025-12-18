import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PacienteServicioService } from './paciente-servicio.service';
import { CreatePacienteServicioDto } from './dto/create-paciente-servicio.dto';
import { AsignarServicioTerapeutaDto } from './dto/asignar-servicio-terapeuta.dto';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('backend_api/paciente-servicio')
export class PacienteServicioController {
  constructor(private readonly pacienteServicioService: PacienteServicioService) {}

  @Post()
  create(@Body() createPacienteServicioDto: CreatePacienteServicioDto) {
    return this.pacienteServicioService.create(createPacienteServicioDto);
  }

  @Get()
  findAll() {
    return this.pacienteServicioService.findAll();
  }

  @Get('paciente/:id')
  findByPaciente(@Param('id') id: string) {
    return this.pacienteServicioService.findByPaciente(+id);
  }

  @Get('servicio/:id')
  findByServicio(@Param('id') id: string) {
    return this.pacienteServicioService.findByServicio(+id);
  }

  @Get('paciente/:id/servicios-con-terapeuta')
  getServiciosConTerapeuta(@Param('id') id: string) {
    return this.pacienteServicioService.getServiciosConTerapeutaActual(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pacienteServicioService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePacienteServicioDto: Partial<CreatePacienteServicioDto>) {
    return this.pacienteServicioService.update(+id, updatePacienteServicioDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pacienteServicioService.remove(+id);
  }

  @Post('asignar')
  @UseGuards(JwtAuthGuard)
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'ASIGNAR_SERVICIO',
  })
  asignarServicioYTerapeuta(@Body() dto: AsignarServicioTerapeutaDto) {
    return this.pacienteServicioService.asignarServicioYTerapeuta(dto);
  }

  @Delete('paciente/:pacienteId/servicio/:servicioId')
  @UseGuards(JwtAuthGuard)
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'DESASIGNAR_SERVICIO',
  })
  desasignarServicio(
    @Param('pacienteId') pacienteId: string,
    @Param('servicioId') servicioId: string
  ) {
    return this.pacienteServicioService.desasignarServicio(+pacienteId, +servicioId);
  }

  @Delete('desasignar/:id')
  @UseGuards(JwtAuthGuard)
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'DESASIGNAR_SERVICIO',
  })
  desasignarServicioPorId(@Param('id') id: string) {
    return this.pacienteServicioService.desasignarServicioPorId(+id);
  }

  @Post('asignacion')
  @UseGuards(JwtAuthGuard)
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'CREAR_ASIGNACION_TERAPEUTA',
  })
  crearAsignacionTerapeuta(
    @Body() dto: {
      paciente_servicio_id: number;
      terapeuta_id: number;
      fecha_asignacion: string;
      estado: string;
      user_id_crea: number;
    }
  ) {
    return this.pacienteServicioService.crearAsignacionTerapeuta(dto);
  }

  @Patch('asignacion/:id')
  @UseGuards(JwtAuthGuard)
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'EDITAR_TERAPEUTA',
  })
  actualizarAsignacionTerapeuta(
    @Param('id') id: string,
    @Body() dto: { terapeuta_id: number; user_id_actua: number }
  ) {
    return this.pacienteServicioService.actualizarAsignacionTerapeuta(+id, dto);
  }

  @Delete('asignacion/:id')
  @UseGuards(JwtAuthGuard)
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'DESASIGNAR_TERAPEUTA',
  })
  desasignarTerapeutaIndividual(@Param('id') id: string) {
    return this.pacienteServicioService.desasignarTerapeutaIndividual(+id);
  }
} 