import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, IsPositive, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleVentaServicioDto {
  @IsNumber()
  @Type(() => Number)
  paciente_id: number;

  @IsNumber()
  @Type(() => Number)
  servicio_id: number;

  /** 1 = Sesión unitaria, 2 = Paquete */
  @IsNumber()
  @Type(() => Number)
  tipo_venta_id: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paquete_id?: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  sesiones_totales: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
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

export class CreateVentaServicioDto {
  /** 1=Paciente, 2=Responsable, 3=Externo */
  @IsNumber()
  @Type(() => Number)
  tipo_pagador_id: number;

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
  @IsString()
  nota?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaServicioDto)
  detalles: DetalleVentaServicioDto[];

  @IsOptional()
  user_crea_id?: number;

  @IsNumber()
  @IsIn([1, 2, 3])
  @Type(() => Number)
  tipo_comprobante_id: number;
}
