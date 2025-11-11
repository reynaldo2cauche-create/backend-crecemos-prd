import { PartialType } from '@nestjs/mapped-types';
import { CreateEvaluacionTerapiaDto } from './create-evaluacion-terapia.dto';

export class UpdateEvaluacionTerapiaDto extends PartialType(CreateEvaluacionTerapiaDto) {}