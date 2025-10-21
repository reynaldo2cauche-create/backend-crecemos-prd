import { IsOptional, IsString, IsIn, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterLibroReclamacionDto {
  @IsOptional()
  @IsString()
  numeroReclamo?: string;

  @IsOptional()
  @IsString()
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  @IsIn(['queja', 'reclamo', 'sugerencia'])
  tipoReclamo?: string;

  @IsOptional()
  @IsString()
  @IsIn(['RECIBIDO', 'EN_REVISION', 'RESPONDIDO', 'CERRADO'])
  estado?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'fecha_registro';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: string = 'DESC';
}
