import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class UpdateDocumentoTarifaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  precio?: number;

  @IsNumber()
  @IsOptional()
  user_actua_id?: number;
}
