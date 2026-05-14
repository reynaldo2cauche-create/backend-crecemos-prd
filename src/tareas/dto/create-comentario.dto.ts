import { IsString, IsOptional } from 'class-validator';

export class CreateComentarioDto {
  @IsOptional()
  @IsString()
  contenido?: string;
}
