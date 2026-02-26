import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PacienteResponsableService } from '../services/paciente-responsable.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';
import { RequiereUbicacion } from 'src/geofencing/requiere-ubicacion.decorator';

/**
 * Controlador para endpoints globales de responsables
 * (sin necesidad de pacienteId)
 */
@Controller('backend_api/responsables')
@UseGuards(JwtAuthGuard)
export class ResponsablesController {
  constructor(
    private readonly responsableService: PacienteResponsableService,
  ) {}

  /**
   * GET /backend_api/responsables
   * Obtener TODOS los responsables (para autocomplete en ventas)
   */
  @Get()
  @RequiereUbicacion()
  @Auditable({
    modulo: 'RESPONSABLES',
    accion: 'LISTAR_TODOS',
  })
  async getTodosLosResponsables() {
    const responsables = await this.responsableService.getTodosLosResponsables();
    return {
      success: true,
      data: responsables,
    };
  }

  /**
   * GET /backend_api/responsables/:responsableId/pacientes
   * Obtener todos los pacientes a cargo de un responsable
   */
  @Get(':responsableId/pacientes')
  @RequiereUbicacion()
  @Auditable({
    modulo: 'RESPONSABLES',
    accion: 'LISTAR_PACIENTES_RESPONSABLE',
  })
  async getPacientesDelResponsable(@Param('responsableId', ParseIntPipe) responsableId: number) {
    const pacientes = await this.responsableService.getPacientesPorResponsable(responsableId);
    return {
      success: true,
      data: pacientes,
    };
  }
}
