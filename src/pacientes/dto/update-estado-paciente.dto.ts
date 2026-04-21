import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateEstadoPacienteDto {
  @IsNumber()
  @IsNotEmpty()
  estado_paciente_id: number;

  @IsNumber()
  @IsNotEmpty()
  user_id_actua: number;
} 