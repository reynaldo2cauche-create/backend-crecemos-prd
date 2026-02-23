import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleCompraDto {
  @IsNumber()
  @Type(() => Number)
  producto_id: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  precio_unitario: number;
}

export class CreateCompraReposicionDto {
  @IsNumber()
  @Type(() => Number)
  proveedor_id: number;

  @IsString()
  fecha_compra: string;

  @IsOptional()
  @IsString()
  nota?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleCompraDto)
  detalles: DetalleCompraDto[];

  @IsOptional()
  user_crea_id?: number;
}
