import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CrearCuentaBancariaDto {
  @IsNumber()
  @IsNotEmpty()
  trabajadorId: number;

  @IsString()
  @IsNotEmpty()
  banco: string;

  @IsString()
  @IsNotEmpty()
  numero_cuenta: string;

  @IsString()
  @IsOptional()
  cci?: string;

  @IsBoolean()
  @IsOptional()
  es_principal?: boolean;
}
