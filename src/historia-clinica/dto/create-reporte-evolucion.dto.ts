import { IsNumber, IsString, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateReporteEvolucionDto {
  @IsNumber()
  @IsNotEmpty()
  paciente_id: number;

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

  @IsNumber()
  @IsNotEmpty()
  usuario_id: number;
}
