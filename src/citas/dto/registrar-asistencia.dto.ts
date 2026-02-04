import { IsNumber, IsNotEmpty } from 'class-validator';

export class RegistrarRecepcionDto {
  @IsNumber()
  @IsNotEmpty()
  cita_id: number;

  @IsNumber()
  @IsNotEmpty()
  usuario_id: number;

  @IsNumber()
  @IsNotEmpty()
  estado_id: number; // 7 = ASISTIÓ, 6 = NO_ASISTIÓ
}

export class RegistrarTerapeutaDto {
  @IsNumber()
  @IsNotEmpty()
  cita_id: number;

  @IsNumber()
  @IsNotEmpty()
  terapeuta_id: number;

  @IsNumber()
  @IsNotEmpty()
  estado_id: number; // 4 = COMPLETADA, 6 = NO_ASISTIÓ
}
