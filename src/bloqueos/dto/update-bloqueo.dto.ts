import { PartialType } from '@nestjs/mapped-types';
import { CreateBloqueoDto } from './create-bloqueo.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateBloqueoDto extends PartialType(CreateBloqueoDto) {
  @IsOptional()
  @IsInt()
  userIdActua?: number;
}
