import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DetalleVentaProductoDto } from './create-venta-producto.dto';

export class UpdateVentaProductoDto {
  @IsOptional()
  @IsString()
  fecha_venta?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  descuento_tipo_id?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  descuento_valor?: number;

  @IsOptional()
  @IsString()
  nota?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  modalidad_pago_id?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaProductoDto)
  detalles?: DetalleVentaProductoDto[];

  @IsOptional()
  user_actua_id?: number;
}
