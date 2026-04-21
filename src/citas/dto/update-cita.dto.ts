import { PartialType } from '@nestjs/mapped-types';
import { CreateCitaDto } from './create-cita.dto';
import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';

export class UpdateCitaDto extends PartialType(CreateCitaDto) {
  @IsOptional()
  @IsString()
  hora_fin?: string;

}