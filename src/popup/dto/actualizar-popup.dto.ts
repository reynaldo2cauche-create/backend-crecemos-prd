import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class ActualizarPopupDto {
  @IsString()
  @IsOptional()
  titulo?: string;

  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @IsDateString()
  @IsOptional()
  fechaFin?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsOptional()
  userId?: number;

  @IsString() // 👈 NUEVO
  @IsOptional()
  mensajeWhatsapp?: string;
}
