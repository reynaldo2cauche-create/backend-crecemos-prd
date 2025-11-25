// src/rrhh/dto/registrar-pago-mensual.dto.ts
import { IsInt, IsNumber, IsString, Min, IsDateString } from 'class-validator';

export class RegistrarPagoMensualDto {
  @IsInt()
  @Min(1)
  empleadoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto: number;

  @IsString()
  mes: string; // enero, febrero, etc.

  @IsInt()
  anio: number;

  @IsDateString()
  fechaPago: string; // fecha real del pago
}
