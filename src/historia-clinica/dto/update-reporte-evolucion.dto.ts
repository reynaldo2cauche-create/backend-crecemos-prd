import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateReporteEvolucionDto {
  @IsOptional()
  @IsNumber()
  servicio_id?: number;

  @IsOptional()
  @IsNumber()
  edad?: number;

  @IsOptional()
  @IsDateString()
  fecha_evaluacion?: string;

  @IsOptional()
  @IsString()
  periodo_intervencion?: string;

  @IsOptional()
  @IsString()
  frecuencia_atencion?: string;

  @IsOptional()
  @IsString()
  especialista?: string;

  @IsOptional()
  @IsString()
  metodologia?: string;

  @IsOptional()
  @IsString()
  objetivos?: string;

  @IsOptional()
  @IsString()
  logros?: string;

  @IsOptional()
  @IsString()
  dificultades?: string;

  @IsOptional()
  @IsString()
  objetivos_siguiente_periodo?: string;

  @IsOptional()
  @IsNumber()
  usuario_id?: number;
}
