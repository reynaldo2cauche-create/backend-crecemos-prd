import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSolicitudInformeDto {
  @IsInt()
  @IsNotEmpty()
  servicio_id: number;

  @IsInt()
  @IsNotEmpty()
  venta_servicio_id: number;

  @IsInt()
  @IsNotEmpty()
  tipo_archivo_id: number;

  @IsInt()
  @IsNotEmpty()
  especialista_id: number;

  @IsString()
  @IsNotEmpty()
  fecha_solicitud: string;

  @IsOptional()
  @IsString()
  fecha_entrega?: string;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsString()
  @IsNotEmpty()
  nro_recibo: string;

  @IsOptional()
  @IsInt()
  modalidad_pago_id?: number;

  @IsOptional()
  @IsInt()
  estado_pago_id?: number;

  @IsOptional()
  @IsString()
  nota?: string;

  @IsOptional()
  @IsInt()
  user_crea_id?: number;
}
