import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, IsPositive, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleVentaServicioDto {
  @IsNumber()
  @Type(() => Number)
  paciente_id: number;

  /** 1=Servicio con cita, 2=Documento sin cita */
  @IsOptional()
  @IsNumber()
  @IsIn([1, 2])
  @Type(() => Number)
  tipo_item_venta?: number = 1;

  /** Obligatorio si tipo_item_venta=1, NULL si tipo_item_venta=2 */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  servicio_tarifa_id?: number;

  /** Solo si tipo_item_venta=2, NULL si tipo_item_venta=1 */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  documento_tarifa_id?: number;

  /** Descripción para la boleta: "3 Sesiones de Evaluación", "1 Informe Verbal", "Informe Físico" */
  @IsOptional()
  @IsString()
  descripcion_linea?: string;

  /** 1 = Sesión unitaria, 2 = Paquete, 3 = Paquete combo */
  @IsNumber()
  @Type(() => Number)
  tipo_venta_id: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paquete_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paquete_combo_id?: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  sesiones_totales: number;

@Type(() => Number)
@IsNumber()
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
  @Type(() => DetalleVentaServicioDto)
  detalles: DetalleVentaServicioDto[];

  @IsOptional()
  user_crea_id?: number;

  @IsNumber()
  @IsIn([1, 2, 3])
  @Type(() => Number)
  tipo_comprobante_id: number;
}