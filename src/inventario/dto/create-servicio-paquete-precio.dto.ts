import { IsNotEmpty, IsNumber, IsPositive, IsEnum, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServicioPaquetePrecioDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  servicio_tarifa_id: number;

  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  paquete_id: number;

  @IsNotEmpty()
  @IsEnum(['precio_total', 'descuento_porcentaje'])
  tipo_calculo: 'precio_total' | 'descuento_porcentaje';

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  valor: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  user_crea_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  user_actua_id?: number;
}
