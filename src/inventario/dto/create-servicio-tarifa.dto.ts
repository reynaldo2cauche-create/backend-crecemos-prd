import { IsNumber, IsPositive, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServicioTarifaDto {
  @IsNumber()
  @Type(() => Number)
  servicio_id: number;

  @IsNumber()
  @Type(() => Number)
  motivo_cita_id: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  precio: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  precio_paquete?: number;

  @IsOptional()
  user_crea_id?: number;
}

export class UpdateServicioTarifaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0)
  @Type(() => Number)
  precio: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  precio_paquete?: number;

  @IsOptional()
  user_actua_id?: number;
}
