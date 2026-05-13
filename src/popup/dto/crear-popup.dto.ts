import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean = true;

  @IsOptional()
  userId?: number;
   @IsString() // 👈 NUEVO
  @IsOptional()
  mensajeWhatsapp?: string;
}
