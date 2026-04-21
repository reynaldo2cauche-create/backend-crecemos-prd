import { IsOptional, IsString, IsInt } from 'class-validator';

export class FiltrarReclamosDto {
  @IsOptional()
  @IsInt()
  estado_id?: number;

  @IsOptional()
  @IsInt()
  tipo_solicitud_id?: number;

  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @IsOptional()
  @IsString()
  busqueda?: string; // Para buscar por nombre, documento o código

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
