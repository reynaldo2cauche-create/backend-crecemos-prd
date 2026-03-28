import { IsString, IsOptional, MaxLength, IsEmail } from 'class-validator';

export class CreateCompradorExternoDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  user_crea_id?: number;
}
