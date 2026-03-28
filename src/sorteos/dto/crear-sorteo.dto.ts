import { IsString, IsInt, IsArray, ValidateNested, IsDateString, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GanadorDto {
  @IsInt()
  paciente_id: number;

  @IsInt()
  posicion: number;
}

export class CrearSorteoDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsDateString()
  fecha_sorteo: string;

  @IsInt()
  @Min(1)
  cantidad_ganadores: number;
}

export class RealizarSorteoDto extends CrearSorteoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GanadorDto)
  ganadores: GanadorDto[];
}