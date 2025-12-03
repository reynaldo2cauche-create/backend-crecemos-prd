import { SetMetadata } from '@nestjs/common';

export const AUDITABLE_KEY = 'auditable';

export interface AuditableMetadata {
  modulo: string;
  accion: string;
  entidadTipo?: string;
  permitirSinAuth?: boolean; // Para endpoints públicos (por defecto false)

  // Opciones para especificar de dónde obtener el ID de la entidad
  entidadIdParam?: string;     // Nombre del parámetro en la ruta (ej: 'pacienteId', 'id')
  entidadIdBody?: string;      // Nombre del campo en el body (ej: 'paciente_id')
  entidadIdResponse?: string;  // Ruta al campo en la respuesta (ej: 'paciente.id', 'data.id')
}

/**
 * Decorador para marcar endpoints que deben ser auditados
 *
 * @example Básico
 * @Auditable({
 *   modulo: 'PACIENTES',
 *   accion: 'CREAR_PACIENTE',
 *   entidadTipo: 'Paciente'
 * })
 * @Post()
 * async crearPaciente(@Body() datos: any) {
 *   // Por defecto tomará el ID del resultado
 * }
 *
 * @example Con parámetro específico (para reportes de evolución, etc)
 * @Auditable({
 *   modulo: 'PACIENTES',
 *   accion: 'CREAR_REPORTE_EVOLUCION',
 *   entidadTipo: 'Paciente',
 *   entidadIdParam: 'pacienteId'  // Toma el ID del parámetro de la ruta
 * })
 * @Post('pacientes/:pacienteId/reportes-evolucion')
 * async crearReporteEvolucion(@Param('pacienteId') pacienteId: number) {
 *   // Se registrará el pacienteId, no el ID del reporte creado
 * }
 *
 * @example Con campo del body
 * @Auditable({
 *   modulo: 'CITAS',
 *   accion: 'CREAR_CITA',
 *   entidadTipo: 'Paciente',
 *   entidadIdBody: 'paciente_id'  // Toma el ID del body
 * })
 * @Post()
 * async crearCita(@Body() datos: any) {
 *   // Se registrará datos.paciente_id
 * }
 */
export const Auditable = (metadata: AuditableMetadata) => 
  SetMetadata(AUDITABLE_KEY, metadata);