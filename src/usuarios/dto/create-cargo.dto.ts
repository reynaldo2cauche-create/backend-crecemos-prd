import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateCargoDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsBoolean()
  es_jefe?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
