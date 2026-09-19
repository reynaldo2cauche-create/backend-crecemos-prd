import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateNotaCreditoDto {
  /** Fecha de la devolución (YYYY-MM-DD). Si no llega, se usa hoy. */
  @IsOptional()
  @IsString()
  fecha?: string;

  /** Motivo de la devolución. */
  @IsOptional()
  @IsString()
  motivo?: string;

  /** Monto a reembolsar al cliente. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  monto_devuelto?: number;

  /** Método por el que se devuelve el dinero. */
  @IsOptional()
  @IsNumber()
  modalidad_pago_id?: number;

  @IsOptional()
  @IsNumber()
  user_crea_id?: number;
}
