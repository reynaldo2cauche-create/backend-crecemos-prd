import { PartialType } from '@nestjs/mapped-types';
import { CreateEntrevistaAdultosDto } from './create-entrevista-adultos.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateEntrevistaAdultosDto extends PartialType(CreateEntrevistaAdultosDto) {
  @IsOptional()
  @IsInt()
  userIdActua?: number;
}
