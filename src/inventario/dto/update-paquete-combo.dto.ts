import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional } from 'class-validator';
import { CreatePaqueteComboDto } from './create-paquete-combo.dto';

export class UpdatePaqueteComboDto extends PartialType(CreatePaqueteComboDto) {
  @IsOptional()
  @IsInt()
  user_actua_id?: number;
}
