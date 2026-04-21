import { Controller, Post, Body, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
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
  })
  create(@Body() dto: CreateNotaEvolucionDto) {
    return this.service.create(dto);
  }

  @Get('paciente/:id')
  findByPaciente(
    @Param('id') id: string,
    @Query('trabajador_id') trabajador_id: string,
    @Request() req: any
  ) {
    const trabajadorIdNumber = trabajador_id ? parseInt(trabajador_id, 10) : undefined;
    const usuario = req.user; // Usuario autenticado con rol
    return this.service.findByPaciente(+id, trabajadorIdNumber, usuario);
  }

  @Post('migrar-notas-antiguas')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'MIGRAR_NOTAS_ANTIGUAS',
  })
  migrarNotasAntiguas() {
    return this.service.migrarNotasAntiguas();
  }

  @Get('migrar-notas-antiguas/prueba/:paciente_id')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'PRUEBA_MIGRAR_NOTAS_ANTIGUAS',
  })
  probarMigracionPorPaciente(@Param('paciente_id') paciente_id: string) {
    return this.service.migrarNotasAntiguasPorPaciente(+paciente_id);
  }

} 