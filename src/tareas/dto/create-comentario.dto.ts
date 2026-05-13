import { IsString } from 'class-validator';

export class CreateComentarioDto {
  @IsString()
  contenido: string;
}
