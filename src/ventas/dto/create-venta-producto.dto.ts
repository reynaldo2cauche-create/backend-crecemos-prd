import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, IsPositive, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PagoVentaProductoDto {
  @IsNumber()
  @Type(() => Number)
  modalidad_pago_id: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  monto: number;

  @IsOptional()
  @IsString()
  referencia?: string;
}

export class DetalleVentaProductoDto {
  @IsNumber()
  @Type(() => Number)
  producto_id: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) 
  @Type(() => Number)
  precio_unitario: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  descuento_tipo_id?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  descuento_valor?: number;
}

export class CreateVentaProductoDto {
  /** 1=Paciente, 2=Responsable, 3=Externo */
  @IsNumber()
  @Type(() => Number)
  tipo_comprador_id: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paciente_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  responsable_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  comprador_externo_id?: number;

  @IsString()
  fecha_venta: string;

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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  descuento_promocion?: number;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaProductoDto)
  detalles: DetalleVentaProductoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagoVentaProductoDto)
  pagos?: PagoVentaProductoDto[];

  @IsOptional()
  user_crea_id?: number;

  @IsNumber()
  @IsIn([1, 2, 3])
  @Type(() => Number)
  tipo_comprobante_id: number;
}