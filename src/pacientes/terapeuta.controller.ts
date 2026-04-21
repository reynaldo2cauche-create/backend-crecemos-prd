import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';
import { ComentarioTerapiaService } from './comentario-terapia.service';
import { AsignacionTerapeutaService } from './asignacion-terapeuta.service';
import { CreateHistoriaClinicaDto } from './dto/create-historia-clinica.dto';
import { CreateComentarioTerapiaDto } from './dto/create-comentario-terapia.dto';

@Controller('terapeuta')
export class TerapeutaController {
  constructor(
    private readonly historiaClinicaService: HistoriaClinicaService,
    private readonly comentarioTerapiaService: ComentarioTerapiaService,
    private readonly asignacionTerapeutaService: AsignacionTerapeutaService,
  ) {}

  // Obtener bandeja del terapeuta (solo sus pacientes asignados)
  @Get(':id/bandeja')
  async getBandeja(@Param('id') id: string) {
    const asignaciones = await this.asignacionTerapeutaService.findByTerapeuta(+id);

    // Agrupar por paciente y servicio
    const bandeja = asignaciones.map(asignacion => ({
      paciente: asignacion.pacienteServicio.paciente,
      servicio: asignacion.pacienteServicio.servicio,
      pacienteServicio: asignacion.pacienteServicio,
      asignacion: asignacion
    }));

    return bandeja;
  }

  /**
   * Retorna la lista de subordinados directos de un jefe.
   * Devuelve id, nombres, apellidos de cada subordinado.
   */
  @Get(':id/subordinados')
  async getSubordinados(@Param('id') id: string) {
    return this.asignacionTerapeutaService.getSubordinados(+id);
  }

  /**
   * Bandeja COMPLETA para un jefe: incluye sus propios pacientes
   * + los pacientes de todas sus subordinadas.
   * Si el trabajador no es jefe, devuelve solo su propia bandeja.
   */
  @Get(':id/bandeja-jefe')
  async getBandejaJefe(@Param('id') id: string) {
    const jefeId = +id;
    const subordinadosIds = await this.asignacionTerapeutaService.getSubordinadosIds(jefeId);
    const todosIds = subordinadosIds.length > 0
      ? [jefeId, ...subordinadosIds]
      : [jefeId];

    const asignaciones = await this.asignacionTerapeutaService.findByTerapeutaIds(todosIds);

    return asignaciones.map(asignacion => ({
      paciente: asignacion.pacienteServicio.paciente,
      servicio: asignacion.pacienteServicio.servicio,
      pacienteServicio: asignacion.pacienteServicio,
      asignacion: asignacion,
      terapeuta: {
        id: asignacion.terapeuta?.id,
        nombres: asignacion.terapeuta?.nombres,
        apellidos: asignacion.terapeuta?.apellidos,
      },
      esSubordinado: asignacion.terapeuta?.id !== jefeId,
    }));
  }

  // Obtener historias clínicas del terapeuta
  @Get(':id/historias')
  async getHistorias(@Param('id') id: string) {
    return this.historiaClinicaService.findByTerapeuta(+id);
  }

  // Obtener historias clínicas de un paciente específico del terapeuta
  @Get(':id/paciente/:pacienteId/servicio/:servicioId/historias')
  async getHistoriasPacienteServicio(
    @Param('id') id: string,
    @Param('pacienteId') pacienteId: string,
    @Param('servicioId') servicioId: string
  ) {
    // Primero verificar que el terapeuta esté asignado a este paciente-servicio
    const asignaciones = await this.asignacionTerapeutaService.findByTerapeuta(+id);
    const asignacion = asignaciones.find(a => 
      a.pacienteServicio.paciente.id === +pacienteId && 
      a.pacienteServicio.servicio.id === +servicioId
    );

    if (!asignacion) {
      throw new Error('No tienes permisos para ver este paciente');
    }

    return this.historiaClinicaService.findByPacienteServicio(asignacion.pacienteServicio.id);
  }

  // Crear historia clínica
  @Post('historia')
  async createHistoria(@Body() createHistoriaClinicaDto: CreateHistoriaClinicaDto) {
    return this.historiaClinicaService.create(createHistoriaClinicaDto);
  }

  // Obtener comentarios del terapeuta
  @Get(':id/comentarios')
  async getComentarios(@Param('id') id: string) {
    return this.comentarioTerapiaService.findByTerapeuta(+id);
  }

  // Obtener comentarios de un paciente específico del terapeuta
  @Get(':id/paciente/:pacienteId/servicio/:servicioId/comentarios')
  async getComentariosPacienteServicio(
    @Param('id') id: string,
    @Param('pacienteId') pacienteId: string,
    @Param('servicioId') servicioId: string
  ) {
    // Primero verificar que el terapeuta esté asignado a este paciente-servicio
    const asignaciones = await this.asignacionTerapeutaService.findByTerapeuta(+id);
    const asignacion = asignaciones.find(a => 
      a.pacienteServicio.paciente.id === +pacienteId && 
      a.pacienteServicio.servicio.id === +servicioId
    );

    if (!asignacion) {
      throw new Error('No tienes permisos para ver este paciente');
    }

    return this.comentarioTerapiaService.findByPacienteServicio(asignacion.pacienteServicio.id);
  }

  // Crear comentario
  @Post('comentario')
  async createComentario(@Body() createComentarioTerapiaDto: CreateComentarioTerapiaDto) {
    return this.comentarioTerapiaService.create(createComentarioTerapiaDto);
  }

  // Obtener resumen de pacientes activos del terapeuta
  @Get(':id/resumen-pacientes')
  async getResumenPacientes(@Param('id') id: string) {
    const asignaciones = await this.asignacionTerapeutaService.findByTerapeuta(+id);
    
    const resumen = asignaciones.map(asignacion => ({
      paciente: {
        id: asignacion.pacienteServicio.paciente.id,
        nombres: asignacion.pacienteServicio.paciente.nombres,
        apellido_paterno: asignacion.pacienteServicio.paciente.apellido_paterno,
        apellido_materno: asignacion.pacienteServicio.paciente.apellido_materno,
        fecha_nacimiento: asignacion.pacienteServicio.paciente.fecha_nacimiento
      },
      servicio: asignacion.pacienteServicio.servicio,
      fecha_asignacion: asignacion.fecha_asignacion,
      estado: asignacion.estado
    }));

    return resumen;
  }
} 