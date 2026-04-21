import { IsString, IsNumber, IsEmail } from 'class-validator';

export class CreateParejaDto {
  @IsString()
  nombres: string;

  @IsString()
  apellido_paterno: string;

  @IsString()
  apellido_materno: string;

  @IsNumber()
  tipo_documento_id: number;

  @IsString()
  numero_documento: string;

  @IsString()
  celular: string;

  @IsString()
  direccion: string;

  @IsEmail()
  email: string;
} 