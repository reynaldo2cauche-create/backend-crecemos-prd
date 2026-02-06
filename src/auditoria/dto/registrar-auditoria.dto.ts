import { IsInt, IsString, IsOptional } from 'class-validator';

export class RegistrarAuditoriaDto {
  @IsInt()
  trabajadorId: number;

  @IsString()
  accion: string;

  @IsString()
  modulo: string;

  @IsString()
  descripcion: string;

  @IsOptional()
  datosNuevos?: any;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
    // 📍 Geolocalización
  latitud?: number;
  longitud?: number;
}