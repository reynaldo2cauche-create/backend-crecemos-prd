import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateComentarioTerapiaDto {
  @IsNumber()
  paciente_servicio_id: number;

  @IsNumber()
  terapeuta_id: number;

  @IsString()
  comentario: string;

  @IsString()
  @IsOptional()
  tipo?: string; // GENERAL, EVALUACION, PROGRESO, OBSERVACION

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
} 