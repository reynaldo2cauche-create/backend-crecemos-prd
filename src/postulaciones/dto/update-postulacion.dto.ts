import { PartialType } from '@nestjs/mapped-types';
import { CreatePostulacionDto } from './create-postulacion.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdatePostulacionDto extends PartialType(CreatePostulacionDto) {
  @IsEnum(['Nuevo', 'En revisión', 'Contactado', 'Por entrevistar', 'Rechazado', 'Contratado'])
  @IsOptional()
  estado_postulacion?: string;
}