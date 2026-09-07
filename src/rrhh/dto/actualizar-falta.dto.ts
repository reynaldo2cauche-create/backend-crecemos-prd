import { IsNumber, IsDateString, IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';

export class ActualizarFaltaDto {
  @IsOptional()
  @IsInt()
  tipoFaltaId?: number;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsBoolean()
  descuenta?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsInt()
  userId?: number;
}
