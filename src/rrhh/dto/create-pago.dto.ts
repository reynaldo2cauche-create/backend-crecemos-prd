import { IsString, IsNumber, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePagoDto {
  @IsNumber()
  empleadoId: number;

  @IsString()
  tipo: string; // gratificacion, bono, aguinaldo

  @IsNumber()
  monto: number;

  @IsString()
  periodo: string;

  @Type(() => Date)
  @IsDate()
  fechaPago: Date;

  @IsString()
  @IsOptional()
  registradoPor?: string;
}
