import { PartialType } from '@nestjs/mapped-types';
import { CreateEntrevistaPadresDto } from './create-entrevista-padres.dto';

export class UpdateEntrevistaPadresDto extends PartialType(CreateEntrevistaPadresDto) {}