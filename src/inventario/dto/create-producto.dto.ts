import { IsString, IsOptional, IsNumber, IsPositive, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductoDto {
  @IsNumber()
  @Type(() => Number)
  categoria_id: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  proveedor_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tipo_producto_id?: number;

  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precio_compra?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  precio_venta: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_actual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_minimo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad_medida?: string;

  @IsOptional()
  user_crea_id?: number;
  
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  user_actua_id?: number;
}