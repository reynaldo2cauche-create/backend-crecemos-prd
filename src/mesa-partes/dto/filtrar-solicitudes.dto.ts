import { IsOptional, IsString, IsInt } from 'class-validator';

export class FiltrarSolicitudesDto {
  @IsOptional()
  @IsInt()
  estado_id?: number;

  @IsOptional()
  @IsInt()
  tipo_id?: number;

  @IsOptional()
  @IsInt()
  paciente_id?: number;

  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @IsOptional()
  @IsString()
  busqueda?: string; // número de expediente, nombre de quien entrega o documento

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
