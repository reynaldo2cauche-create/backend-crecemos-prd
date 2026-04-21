import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class CrearPopupDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean = true;

  @IsOptional()
  userId?: number;
   @IsString() // 👈 NUEVO
  @IsOptional()
  mensajeWhatsapp?: string;
}
