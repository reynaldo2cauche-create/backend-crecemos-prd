import { PartialType } from '@nestjs/mapped-types';
import { CreateArchivoDigitalDto } from './create-archivo-digital.dto';

export class UpdateArchivoDigitalDto extends PartialType(CreateArchivoDigitalDto) {}
