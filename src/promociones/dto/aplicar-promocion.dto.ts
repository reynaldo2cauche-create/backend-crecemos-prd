import { IsNumber, IsArray, ValidateNested, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemVentaDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  producto_id?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  servicio_id?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  paquete_id?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  categoria_id?: number;

  @IsOptional()
  @IsNumber()
  motivo_cita_id?: number;

  @IsNumber()
  @Min(0)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precio_unitario: number;

  @IsNumber()
  @Min(0)
  subtotal: number;
}

export class AplicarPromocionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  promociones_excluidas?: number[];
}