import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePostulacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  apellido: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()  // ✅ CAMBIO: Ya no es opcional
  telefono: string;

  @IsString()
  @IsNotEmpty()
  distrito: string;

  @IsString()
  @IsNotEmpty()
  cargo_postulado: string;

  @IsString()
  @IsOptional()  // ✅ Este se asigna por defecto en el service
  estado_postulacion?: string;

  @IsString()
  @IsOptional()  // ✅ Este se asigna automáticamente cuando subes el CV
  documentos_adjuntos?: string;
}