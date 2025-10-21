import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';
import { CreateLibroReclamacionDto } from './create-libro-reclamacion.dto';

export class UpdateLibroReclamacionDto extends PartialType(CreateLibroReclamacionDto) {
  @IsOptional()
  @IsString()
  @IsIn(['RECIBIDO', 'EN_REVISION', 'RESPONDIDO', 'CERRADO'])
  estado?: string;

  @IsOptional()
  @IsString()
  respuesta?: string;

  @IsOptional()
  @IsNumber()
  responsableRespuestaId?: number;
}