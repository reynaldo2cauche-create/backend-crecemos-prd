import { IsString, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class CrearPaqueteDto {
  @IsString()
  nombre: string;

  @IsInt()
  @Min(1)
  cantidad_sesiones: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  flg_activo?: boolean;
}
