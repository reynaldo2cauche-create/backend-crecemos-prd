import { PartialType } from '@nestjs/swagger';
import { CreatePacienteConvenioDto } from './create-paciente-convenio.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdatePacienteConvenioDto extends PartialType(
  OmitType(CreatePacienteConvenioDto, ['paciente_id', 'convenio_id'] as const)
) {}