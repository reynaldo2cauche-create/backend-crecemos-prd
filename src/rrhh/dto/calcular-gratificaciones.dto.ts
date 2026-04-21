
// src/pagos/dto/calcular-gratificaciones.dto.ts
import { IsIn, IsInt, Min, Max } from 'class-validator';

export class CalcularGratificacionesDto {
  @IsIn(['julio', 'diciembre'])
  periodo: 'julio' | 'diciembre';

  @IsInt()
  @Min(2000)
  @Max(2099)
  anio: number;
}
