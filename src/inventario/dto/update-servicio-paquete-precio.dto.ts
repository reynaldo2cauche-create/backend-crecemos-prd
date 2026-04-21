import { PartialType } from '@nestjs/mapped-types';
import { CreateServicioPaquetePrecioDto } from './create-servicio-paquete-precio.dto';

export class UpdateServicioPaquetePrecioDto extends PartialType(CreateServicioPaquetePrecioDto) {}
