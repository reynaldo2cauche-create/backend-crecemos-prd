import { SetMetadata } from '@nestjs/common';

export const AUDITABLE_KEY = 'auditable';

export interface AuditableMetadata {
  modulo: string;
  accion: string;
  entidadTipo?: string;
  permitirSinAuth?: boolean; // Para endpoints públicos (por defecto false)
}

/**
 * Decorador para marcar endpoints que deben ser auditados
 * 
 * @example
 * @Auditable({
 *   modulo: 'PACIENTES',
 *   accion: 'CREAR_PACIENTE',
 *   entidadTipo: 'Paciente'
 * })
 * @Post()
 * async crearPaciente(@Body() datos: any) {
 *   // Tu código
 * }
 */
export const Auditable = (metadata: AuditableMetadata) => 
  SetMetadata(AUDITABLE_KEY, metadata);