import { PartialType } from '@nestjs/mapped-types';
import { CreateTrabajadorCentroDto } from './create-trabajador-centro.dto';

export class UpdateTrabajadorCentroDto extends PartialType(CreateTrabajadorCentroDto) {} 