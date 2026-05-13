import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsOptional()
  userId?: number;

  @IsString() // 👈 NUEVO
  @IsOptional()
  mensajeWhatsapp?: string;
}
