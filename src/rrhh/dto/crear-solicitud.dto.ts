import { IsNotEmpty, IsDateString, IsOptional, IsString, IsInt, IsIn } from 'class-validator';

export const TIPOS_SOLICITUD = [
  'permiso_personal',
  'permiso_medico',
  'permiso_capacitacion',
  'permiso_horas',
  'vacaciones',
  'otro',
] as const;

export class CrearSolicitudDto {
  @IsNotEmpty()
  @IsInt()
  trabajadorId: number;

  @IsNotEmpty()
  @IsIn(TIPOS_SOLICITUD as unknown as string[])
  tipo: string;

  @IsNotEmpty()
  @IsDateString()
  fechaInicio: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  horaDesde?: string; // 'HH:mm'

  @IsOptional()
  @IsString()
  horaHasta?: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  archivoUrl?: string;

  @IsOptional()
  @IsString()
  comentarioColaborador?: string;
}
