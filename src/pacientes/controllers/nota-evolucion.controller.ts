import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { NotaEvolucionService } from '../services/nota-evolucion.service';
import { CreateNotaEvolucionDto } from '../dto/create-nota-evolucion.dto';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('backend_api/nota-evolucion')
@UseGuards(JwtAuthGuard)
export class NotaEvolucionController {
  constructor(private readonly service: NotaEvolucionService) {}

  @Post()
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'CREAR_NOTA_EVOLUCION',
    entidadTipo: 'Paciente',
    entidadIdBody: 'paciente_id',
    entidadIdResponse: 'paciente.id',
  })
  create(@Body() dto: CreateNotaEvolucionDto) {
    return this.service.create(dto);
  }

  @Get('paciente/:id')
  findByPaciente(
    @Param('id') id: string,
    @Query('trabajador_id') trabajador_id?: string
  ) {
    const trabajadorIdNumber = trabajador_id ? parseInt(trabajador_id, 10) : undefined;
    return this.service.findByPaciente(+id, trabajadorIdNumber);
  }

  
} 