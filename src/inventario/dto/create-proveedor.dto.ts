import { IsString, IsOptional, IsNumber, MaxLength, IsEmail } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contacto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsNumber()
  user_crea_id?: number;

  @IsOptional()
  @IsNumber()
  user_actua_id?: number;   // ← este faltaba con @IsNumber()
}