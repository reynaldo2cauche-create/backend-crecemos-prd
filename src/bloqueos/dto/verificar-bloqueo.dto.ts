import { IsInt, IsDateString, IsString } from 'class-validator';

export class VerificarBloqueoDto {
  @IsInt()
  trabajadorId: number;

  @IsDateString()
  fecha: string;

  @IsString()
  hora: string;
}
