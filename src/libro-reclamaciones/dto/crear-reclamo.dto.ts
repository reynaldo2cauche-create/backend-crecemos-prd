import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsEmail } from 'class-validator';

export class CrearReclamoDto {
  // Datos del consumidor
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @IsOptional()
  @IsString()
  tipo_documento?: string;

  @IsOptional()
  @IsString()
  numero_documento?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  menor_edad?: boolean;

  @IsOptional()
  @IsString()
  datos_apoderado?: string;

  // Tipo de bien y solicitud
  @IsInt()
  @IsNotEmpty()
  tipo_bien_id: number;

  @IsInt()
  @IsNotEmpty()
  tipo_solicitud_id: number;

  @IsOptional()
  @IsString()
  descripcion_bien?: string;

  @IsOptional()
  monto_reclamado?: number;

  // Detalle del reclamo
  @IsString()
  @IsNotEmpty()
  detalle_reclamo: string;

  @IsString()
  @IsNotEmpty()
  pedido_consumidor: string;

  // Firma digital (consentimiento)
  @IsOptional()
  @IsBoolean()
  acepta_terminos?: boolean;

  @IsOptional()
  @IsBoolean()
  autoriza_datos?: boolean;
}
