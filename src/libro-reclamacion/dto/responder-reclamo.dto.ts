// dto/responder-reclamo.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsOptional, MinLength } from 'class-validator';

export class ResponderReclamoDto {
  @IsString()
  @IsNotEmpty({ message: 'La respuesta es requerida' })
  @MinLength(10, { message: 'La respuesta debe tener al menos 10 caracteres' })
  respuesta: string;

  @IsNumber()
  @IsNotEmpty({ message: 'El ID del responsable es requerido' })
  responsableRespuestaId: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}