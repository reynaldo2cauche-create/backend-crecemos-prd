import { IsOptional, IsDateString, IsString, IsIn, IsInt } from 'class-validator';
import { TIPOS_SOLICITUD } from './crear-solicitud.dto';

/**
 * Edición de una solicitud por parte de administración (cuando el colaborador se equivoca).
 * Todos los campos son opcionales; solo se actualizan los que llegan. Solo aplica a
 * solicitudes en estado 'pendiente' (la validación de estado va en el service).
 */
export class ActualizarSolicitudDto {
  @IsOptional()
  @IsIn(TIPOS_SOLICITUD as unknown as string[])
  tipo?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string | null;

  @IsOptional()
  @IsString()
  horaDesde?: string | null;

  @IsOptional()
  @IsString()
  horaHasta?: string | null;

  @IsOptional()
  @IsString()
  motivo?: string | null;

  @IsOptional()
  @IsString()
  comentarioColaborador?: string | null;

  // Id del administrador que edita (para el historial).
  @IsOptional()
  @IsInt()
  userId?: number;
}
