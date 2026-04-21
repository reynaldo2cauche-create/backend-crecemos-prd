import { IsInt, IsDateString, Min, IsOptional } from 'class-validator';
import { Column } from 'typeorm';

export class CrearCompraDto {
  @IsInt()
  paciente_id: number;

  @IsInt()
  tipo_compra_id: number;

  @IsOptional()
  @IsInt()
  paquete_id?: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsInt()
  @Min(1)
  sesiones_totales: number;

  @IsDateString()
  fecha_compra: string;
}
