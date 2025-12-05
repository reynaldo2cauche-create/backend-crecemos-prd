import { SetMetadata } from '@nestjs/common';

export const AUDITABLE_KEY = 'auditable';

export interface AuditableMetadata {
  modulo: string;
  accion: string;
}

/**
 * Decorador para marcar endpoints que deben ser auditados
 *
 * @example
 * @Auditable({
 *   modulo: 'PACIENTES',
 *   accion: 'CREAR_PACIENTE'
 * })
 * @Post()
 * async crearPaciente(@Body() datos: any) {
 *   // Registrará automáticamente la acción
 * }
 */
export const Auditable = (metadata: AuditableMetadata) =>
  SetMetadata(AUDITABLE_KEY, metadata);