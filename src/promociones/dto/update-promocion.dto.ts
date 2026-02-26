import { PartialType } from '@nestjs/mapped-types';
import { CreatePromocionDto } from './create-promocion.dto';
import { IsOptional, IsNumber } from 'class-validator';

export class UpdatePromocionDto extends PartialType(CreatePromocionDto) {
  @IsOptional()
  @IsNumber()
  user_actua_id?: number;
}
