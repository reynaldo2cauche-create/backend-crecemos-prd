import { PartialType } from '@nestjs/mapped-types';
import { CreateSolicitudInformeDto } from './create-solicitud-informe.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateSolicitudInformeDto extends PartialType(CreateSolicitudInformeDto) {
  @IsOptional()
  @IsInt()
  user_actua_id?: number;
}
