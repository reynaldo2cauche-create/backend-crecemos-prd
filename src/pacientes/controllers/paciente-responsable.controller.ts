import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PacienteResponsableService } from '../services/paciente-responsable.service';
import { CreateResponsableDto } from '../dto/create-responsable.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';

@Controller('backend_api/pacientes/:pacienteId/responsables')
@UseGuards(JwtAuthGuard)
export class PacienteResponsableController {
  constructor(
    private readonly responsableService: PacienteResponsableService,
  ) {}

  /**
   * GET /backend_api/pacientes/:pacienteId/responsables
   * Obtener todos los responsables de un paciente
   */
  @Get()
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'LISTAR_RESPONSABLES',
  })
  async getResponsables(@Param('pacienteId', ParseIntPipe) pacienteId: number) {
    const responsables = await this.responsableService.getResponsables(pacienteId);
    return {
      success: true,
      data: responsables,
    };
  }

  /**
   * POST /backend_api/pacientes/:pacienteId/responsables
   * Agregar un nuevo responsable al paciente
   * Si detecta datos legacy, automáticamente los migra
   */
  @Post()
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'AGREGAR_RESPONSABLE',
  })
  async agregarResponsable(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Body() dto: CreateResponsableDto,
  ) {
    const responsable = await this.responsableService.agregarResponsable(pacienteId, {
      nombres: dto.nombres,
      apellido_paterno: dto.apellido_paterno,
      apellido_materno: dto.apellido_materno,
      tipo_documento_id: dto.tipo_documento_id,
      numero_documento: dto.numero_documento,
      responsable_relacion_id: dto.responsable_relacion_id,
      telefono: dto.telefono,
      email: dto.email,
      tiene_proceso_legal: dto.tiene_proceso_legal || false,
      proceso_legal_infantil_id: dto.proceso_legal_infantil_id || null,
    });

    return {
      success: true,
      message: 'Responsable agregado correctamente',
      data: responsable,
    };
  }

 @Put(':responsableId')
async actualizarResponsable(
  @Param('pacienteId') pacienteId: number,
  @Param('responsableId') responsableId: string, // Cambiado a string para aceptar "null"
  @Body() responsableData: CreateResponsableDto,
) {
  // Convertir "null" string a null real
  const id = responsableId === 'null' ? null : Number(responsableId);
  
  return this.responsableService.actualizarResponsable(
    id,
    pacienteId,
    responsableData,
  );
}
  /**
   * DELETE /backend_api/pacientes/:pacienteId/responsables/:responsableId
   * Eliminar (soft delete) un responsable
   */
  @Delete(':responsableId')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'ELIMINAR_RESPONSABLE',
  })
  async eliminarResponsable(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Param('responsableId', ParseIntPipe) responsableId: number,
  ) {
    await this.responsableService.eliminarResponsable(responsableId, pacienteId);

    return {
      success: true,
      message: 'Responsable eliminado correctamente',
    };
  }

  /**
   * POST /backend_api/pacientes/:pacienteId/responsables/reordenar
   * Reordenar los responsables de un paciente
   */
  @Post('reordenar')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'REORDENAR_RESPONSABLES',
  })
  async reordenarResponsables(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Body('orden') orden: number[],
  ) {
    await this.responsableService.reordenarResponsables(pacienteId, orden);

    return {
      success: true,
      message: 'Responsables reordenados correctamente',
    };
  }
}
