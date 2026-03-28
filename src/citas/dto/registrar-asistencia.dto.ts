import { IsNumber, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class RegistrarRecepcionDto {
  @IsNumber()
  @IsNotEmpty()
  cita_id: number;

  @IsNumber()
  @IsNotEmpty()
  usuario_id: number;

  @ValidateIf((o) => o.estado_id !== null)
  @IsNumber()
  @IsOptional()
  estado_id: number | null; // 7 = ASISTIÓ, 6 = SESIÓN DICTADA, null = DESMARCAR
}

export class RegistrarTerapeutaDto {
  @IsNumber()
  @IsNotEmpty()
  cita_id: number;

  @IsNumber()
  @IsNotEmpty()
  terapeuta_id: number;

  @ValidateIf((o) => o.estado_id !== null)
  @IsNumber()
  @IsOptional()
  estado_id: number | null; // 7 = ASISTIÓ, 6 = SESIÓN DICTADA, null = DESMARCAR
}
