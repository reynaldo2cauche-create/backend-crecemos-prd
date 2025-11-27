import { IsNotEmpty, IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';

export class RegistrarVacacionDto {
  @IsNotEmpty()
  @IsNumber()
  empleadoId: number;

  @IsNotEmpty()
  @IsDateString()
  fechaInicio: string;

  @IsNotEmpty()
  @IsDateString()
  fechaFin: string;

  @IsNotEmpty()
  @IsNumber()
  periodoAnio: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
