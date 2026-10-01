import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

/**
 * DTO genérico para acciones simples que solo registran un evento en la bitácora:
 * observar, notificar y entregar.
 */
export class AccionSolicitudDto {
  // Nota/comentario de la acción (obligatorio en observación, opcional en el resto)
  @IsOptional()
  @IsString()
  comentario?: string;

  // Usuario que realiza la acción (auditoría)
  @IsInt()
  @IsNotEmpty()
  usuario_id: number;
}
