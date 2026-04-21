import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCategoriaProductoDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  user_crea_id?: number;
}
