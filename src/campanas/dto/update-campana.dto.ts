import { PartialType } from '@nestjs/mapped-types';
import { CreateCampanaDto } from './create-campana.dto';
import { IsOptional, IsNumber } from 'class-validator';

export class UpdateCampanaDto extends PartialType(CreateCampanaDto) {
  @IsOptional()
  @IsNumber()
  user_actua_id?: number;
}
