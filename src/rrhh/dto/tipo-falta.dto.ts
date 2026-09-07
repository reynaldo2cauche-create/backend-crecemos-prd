import { IsNotEmpty, IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class CrearTipoFaltaDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsBoolean()
  descuenta?: boolean;
}

export class ActualizarTipoFaltaDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  descuenta?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
