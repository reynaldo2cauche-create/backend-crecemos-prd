import {
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePromocionReglaDto {
  @IsNumber()
  @Min(1)
  condicion_tipo_id: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)                          // ← cambio aquí, era @IsPositive()
  condicion_valor: number;

  @IsNumber()
  @Min(1)
  beneficio_tipo_id: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @ValidateIf((o) => o.beneficio_tipo_id === 1 || o.beneficio_tipo_id === 2)
  beneficio_valor?: number;

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => o.beneficio_tipo_id === 4)
  beneficio_producto_id?: number;
}