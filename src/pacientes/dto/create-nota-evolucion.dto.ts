import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateNotaEvolucionDto {
  @IsNumber()
  paciente_id: number;

  @IsString()
  @IsOptional()
  entrevista: string;

  @IsString()
  @IsOptional()
  sesion_evaluacion?: string;

  @IsString()
  @IsOptional()
  sesion_terapias?: string;

  @IsString()
  @IsOptional()
  objetivos_terapeuticos?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsNumber()
  user_id_crea: number;
} 