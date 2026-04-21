import { IsNumber, IsDateString, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateHistoriaClinicaDto {
  @IsNumber()
  paciente_servicio_id: number;

  @IsNumber()
  terapeuta_id: number;

  @IsDateString()
  fecha_sesion: string;

  @IsString()
  hora_inicio: string;

  @IsString()
  hora_fin: string;

  @IsString()
  objetivo_sesion: string;

  @IsString()
  actividades_realizadas: string;

  @IsString()
  observaciones: string;

  @IsString()
  @IsOptional()
  tareas_casa?: string;

  @IsString()
  @IsOptional()
  recomendaciones?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
} 