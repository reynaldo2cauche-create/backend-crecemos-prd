import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaqueteComboItemDto {
  @IsOptional()
  @IsInt()
  servicio_tarifa_id?: number;

  @IsOptional()
  @IsInt()
  documento_tarifa_id?: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsString()
  descripcion_linea?: string;
}

export class CreatePaqueteComboDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  precio_total: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_tachado?: number;

  @IsOptional()
  @IsInt()
  flg_activo?: number;

  @IsOptional()
  @IsInt()
  user_crea_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaqueteComboItemDto)
  items: CreatePaqueteComboItemDto[];
}
