import { IsString, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSeccionDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsString()
  contenido: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class CreateCampanaDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion_corta?: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsOptional()
  @IsNumber()
  estado_id?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @IsOptional()
  @IsNumber()
  user_crea_id?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeccionDto)
  secciones?: CreateSeccionDto[];
}
