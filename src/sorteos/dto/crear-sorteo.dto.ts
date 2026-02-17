import { IsString, IsInt, IsArray, ValidateNested, IsDateString, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ReglaDto {
  @IsInt()
  tipo_compra_id: number;

  @IsOptional()
  @IsInt()
  paquete_id?: number;

  @IsInt()
  @Min(1)
  opciones_por_unidad: number;
}

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

  // ✅ REGLAS AHORA SON OPCIONALES (para sorteos manuales)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReglaDto)
  reglas?: ReglaDto[];
}


export class RealizarSorteoDto extends CrearSorteoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GanadorDto)
  ganadores: GanadorDto[];
}
