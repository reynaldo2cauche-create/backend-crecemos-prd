import { IsNumber } from 'class-validator';

export class AsignarTerapeutaDto {
  @IsNumber()
  paciente_servicio_id: number;

  @IsNumber()
  terapeuta_id: number;
} 