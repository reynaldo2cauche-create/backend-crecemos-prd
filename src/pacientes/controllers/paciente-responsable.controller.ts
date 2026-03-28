import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PacienteResponsableService } from '../services/paciente-responsable.service';
import { CreateResponsableDto } from '../dto/create-responsable.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';

@Controller('backend_api/pacientes/:pacienteId/responsables')

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
    const responsables = await this.responsableService.getResponsablesPorPaciente(pacienteId);
    return {
      success: true,
      data: responsables,
    };
  }

  /**
   * GET /backend_api/pacientes/:pacienteId/responsables/buscar-por-dni/:dni
   * Buscar responsable por DNI para reutilizar en nuevos pacientes
   * Devuelve: ID + nombres/apellidos (read-only)
   * NO devuelve: teléfono, email (datos sensibles)
   */
  @Get('buscar-por-dni/:dni')
  async buscarPorDni(@Param('dni') dni: string) {
    const responsable = await this.responsableService.buscarPorDni(dni);

    if (!responsable) {
      return {
        success: false,
        message: 'No se encontró ningún responsable con ese DNI',
        data: { ya_existe: false },
      };
    }

    // ✅ Devolver ID + nombres para reutilizar responsable (evita duplicados)
    // ❌ NO enviar teléfono, email (protección de datos sensibles)
    return {
      success: true,
      data: {
        ya_existe: true,
        id: responsable.id, // 🆕 ID para reutilizar en el registro
        nombres: responsable.nombres,
        apellido_paterno: responsable.apellido_paterno,
        apellido_materno: responsable.apellido_materno,
      },
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

  /**
   * PUT /backend_api/pacientes/:pacienteId/responsables/:responsableId
   * Actualizar un responsable y su relación con el paciente
   */
  @Put(':responsableId')
  @Auditable({
    modulo: 'PACIENTES',
    accion: 'ACTUALIZAR_RESPONSABLE',
  })
  async actualizarResponsable(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Param('responsableId', ParseIntPipe) responsableId: number,
    @Body() dto: CreateResponsableDto,
  ) {
    const responsable = await this.responsableService.actualizarResponsable(
      pacienteId,
      responsableId,
      {
        nombres: dto.nombres,
        apellido_paterno: dto.apellido_paterno,
        apellido_materno: dto.apellido_materno,
        tipo_documento_id: dto.tipo_documento_id,
        numero_documento: dto.numero_documento,
        responsable_relacion_id: dto.responsable_relacion_id,
        telefono: dto.telefono,
        email: dto.email,
        tiene_proceso_legal: dto.tiene_proceso_legal,
        proceso_legal_infantil_id: dto.proceso_legal_infantil_id,
      },
    );

    return {
      success: true,
      message: 'Responsable actualizado correctamente',
      data: responsable,
    };
  }
  /**
   * DELETE /backend_api/pacientes/:pacienteId/responsables/:responsableId
   * Desvincular un responsable de un paciente (soft delete)
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
    const result = await this.responsableService.eliminarResponsable(pacienteId, responsableId);
    return result;
  }
}
