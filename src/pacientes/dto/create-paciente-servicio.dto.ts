import { IsNumber, IsDateString, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePacienteServicioDto {
  @IsNumber()
  paciente_id: number;

  @IsNumber()
  servicio_id: number;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @IsString()
  @IsOptional()
  motivo_consulta?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsNumber()
  @IsOptional()
  estado_paciente_id?: number;
} 