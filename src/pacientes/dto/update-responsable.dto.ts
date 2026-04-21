import { IsString, IsOptional, IsNumber, IsBoolean, IsEmail } from 'class-validator';

export class UpdateResponsableDto {
  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellido_paterno?: string;

  @IsOptional()
  @IsString()
  apellido_materno?: string;

  @IsOptional()
  @IsNumber()
  tipo_documento_id?: number;

  @IsOptional()
  @IsString()
  numero_documento?: string;

  @IsOptional()
  @IsNumber()
  responsable_relacion_id?: number;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  tiene_proceso_legal?: boolean;

  @IsOptional()
  @IsNumber()
  proceso_legal_infantil_id?: number;
}
