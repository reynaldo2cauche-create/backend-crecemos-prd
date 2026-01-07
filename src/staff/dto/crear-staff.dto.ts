import { IsNotEmpty, IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CrearStaffDto {
  @IsNotEmpty()
  @IsInt()
  trabajador_id: number;

  @IsOptional()
  @IsString()
  descripcion_especialidad?: string;

  @IsOptional()
  @IsString()
  foto?: string;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsInt()
  user_id_crea?: number;

  @IsOptional()
  @IsInt()
  user_id_actualiza?: number;
}
