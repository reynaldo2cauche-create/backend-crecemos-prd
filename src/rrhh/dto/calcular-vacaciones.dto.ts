import { IsNotEmpty, IsNumber } from 'class-validator';

export class CalcularVacacionesDto {
  @IsNotEmpty()
  @IsNumber()
  anio: number; // Año actual para calcular vacaciones disponibles
}
