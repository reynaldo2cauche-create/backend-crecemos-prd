import { IsNumber, IsString, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateDocumentoTarifaDto {
  @IsNumber()
  @IsNotEmpty()
  tipo_archivo_id: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  precio: number;

  @IsNumber()
  @IsOptional()
  user_crea_id?: number;
}
