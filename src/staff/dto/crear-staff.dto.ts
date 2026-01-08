import { IsNotEmpty, IsInt, IsString, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearCursoDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsNotEmpty()
  @IsString()
  descripcion: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}

export class CrearStaffDto {
  @IsNotEmpty()
  @IsInt()
  trabajador_id: number;

  @IsOptional()
  @IsString()
  descripcion_especialidad?: string;

  @IsOptional()
  @IsString()
  foto?: string;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsInt()
  user_id_crea?: number;

  @IsOptional()
  @IsInt()
  user_id_actualiza?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearCursoDto)
  cursos?: CrearCursoDto[];
}