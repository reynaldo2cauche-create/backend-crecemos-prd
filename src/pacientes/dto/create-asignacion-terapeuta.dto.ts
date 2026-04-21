import { IsNumber, IsDateString, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAsignacionTerapeutaDto {
  @IsNumber()
  paciente_servicio_id: number;

  @IsNumber()
  terapeuta_id: number;

  @IsDateString()
  fecha_asignacion: string;

  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
} 