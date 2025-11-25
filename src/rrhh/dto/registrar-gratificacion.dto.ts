// src/pagos/dto/registrar-gratificacion.dto.ts
import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class RegistrarGratificacionDto {
  @IsInt()
  @Min(1)
  empleadoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto: number;

  @IsString()
  periodo: string;
}