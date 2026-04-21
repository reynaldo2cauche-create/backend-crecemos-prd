import { IsOptional, IsString, IsNumber } from 'class-validator';

export class FindPacientesFiltersDto {
  @IsOptional()
  @IsNumber()
  terapeutaId?: number;

  @IsOptional()
  @IsString()
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  distritoId?: number;

  @IsOptional()
  @IsNumber()
  estadoId?: number;

  @IsOptional()
  @IsNumber()
  servicioId?: number;
} 