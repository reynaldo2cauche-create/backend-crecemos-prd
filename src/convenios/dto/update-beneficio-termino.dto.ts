// src/convenios/dto/update-beneficio-termino.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateBeneficioTerminoDto } from './create-beneficio-termino.dto';

export class UpdateBeneficioTerminoDto extends PartialType(CreateBeneficioTerminoDto) {}
