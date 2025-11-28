import { IsString, IsNumber, IsOptional, IsEmail } from 'class-validator';

export class CreateTrabajadorCentroDto {
  @IsString()
  nombres: string;

  @IsString()
  apellidos: string;

  @IsString()
  dni: string;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEmail()
  email: string;

  @IsNumber()
  rol_id: number;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsNumber()
  institucion_id?: number;

  @IsOptional()
  @IsNumber()
  especialidad_id?: number;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  telefono_emergencia?: string;

  @IsOptional()
  @IsString()
  contacto_emergencia?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  distrito?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  talla_polo?: string;

  @IsOptional()
  @IsString()
  talla_pantalon?: string;

  @IsOptional()
  @IsString()
  talla_zapatos?: string;
} 