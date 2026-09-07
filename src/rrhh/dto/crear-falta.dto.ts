import { IsNotEmpty, IsNumber, IsDateString, IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';

export class CrearFaltaDto {
  @IsNotEmpty()
  @IsInt()
  empleadoId: number;

  @IsNotEmpty()
  @IsInt()
  tipoFaltaId: number;

  @IsNotEmpty()
  @IsDateString()
  fechaInicio: string;

  @IsNotEmpty()
  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsBoolean()
  descuenta?: boolean; // si se omite, usa el default del tipo

  @IsOptional()
  @IsNumber()
  montoDescuento?: number; // monto manual que ingresa RRHH; si se envía, no se calcula por horario

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsInt()
  userId?: number;
}
