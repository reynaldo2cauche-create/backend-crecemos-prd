import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CreateComentarioDto {
  @IsInt()
  @IsNotEmpty()
  id_postulacion: number;

  @IsInt()
  @IsNotEmpty()
  id_trabajador: number;

  @IsString()
  @IsNotEmpty()
  comentario: string;
}