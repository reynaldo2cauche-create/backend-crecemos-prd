import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class ActualizarCuentaBancariaDto {
  @IsString()
  @IsOptional()
  banco?: string;

  @IsString()
  @IsOptional()
  numero_cuenta?: string;

  @IsString()
  @IsOptional()
  cci?: string;

  @IsBoolean()
  @IsOptional()
  es_principal?: boolean;
}
