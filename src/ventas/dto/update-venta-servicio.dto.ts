import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { DetalleVentaServicioDto } from './create-venta-servicio.dto';

export class UpdateVentaServicioDto {
  @IsOptional()
  @IsString()
  fecha_venta?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tipo_pagador_id?: number;

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

  @IsOptional()
  @IsNumber()
  @IsIn([1, 2, 3])
  @Type(() => Number)
  tipo_comprobante_id?: number;

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
  @Type(() => DetalleVentaServicioDto)
  detalles?: DetalleVentaServicioDto[];

  @IsOptional()
  user_actua_id?: number;
}