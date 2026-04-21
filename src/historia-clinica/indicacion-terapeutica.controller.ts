import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { IndicacionTerapeuticaService } from './indicacion-terapeutica.service';
import { CreateIndicacionTerapeuticaDto } from './dto/create-indicacion-terapeutica.dto';
import { IndicacionTerapeutica } from './entities/indicacion-terapeutica.entity';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('backend_api/historia-clinica/indicacion-terapeutica')
@UseGuards(JwtAuthGuard)
export class IndicacionTerapeuticaController {
  constructor(private readonly indicacionService: IndicacionTerapeuticaService) {}

  @Auditable({
    modulo: 'HISTORIA_CLINICA',
    accion: 'CREAR_INDICACION_TERAPEUTICA',
  })
  @Post()
  create(@Body() dto: CreateIndicacionTerapeuticaDto): Promise<IndicacionTerapeutica> {
    return this.indicacionService.create(dto);
  }

  @Get('paciente/:id')
  findByPaciente(@Param('id', ParseIntPipe) pacienteId: number): Promise<IndicacionTerapeutica[]> {
    return this.indicacionService.findByPaciente(pacienteId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<IndicacionTerapeutica> {
    return this.indicacionService.findOne(id);
  }

  @Auditable({
    modulo: 'HISTORIA_CLINICA',
    accion: 'ELIMINAR_INDICACION_TERAPEUTICA',
  })
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.indicacionService.delete(id);
  }
}
