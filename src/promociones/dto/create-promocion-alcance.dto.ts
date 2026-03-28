import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePromocionAlcanceDto {
  @IsNumber()
  @Min(1)
  tipo_alcance_id: number;

  @IsNumber()
  @Min(1)
  referencia_id: number;

  @IsOptional()
  @IsNumber()
  motivo_cita_id?: number;
}
