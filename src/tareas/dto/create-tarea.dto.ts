import { IsString, IsOptional, IsNumber, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

class AsignacionDto {
  @IsOptional()
  @IsNumber()
  usuario_id?: number;

  @IsOptional()
  @IsNumber()
  rol_id?: number;
}

export class CreateTareaDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  @IsNumber()
  prioridad_id?: number;

  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  @IsNumber()
  columna_id?: number;

  @IsOptional()
  @IsDateString()
  fecha_limite?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignacionDto)
  asignaciones?: AsignacionDto[];
}
