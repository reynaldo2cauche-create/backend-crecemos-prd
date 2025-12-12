import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EncargadoDto {
  @IsNotEmpty()
  @IsString()
  nombre_completo: string;

  @IsNotEmpty()
  @IsString()
  institucion: string;

  @IsNotEmpty()
  @IsString()
  telefono: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class CreateCitaDto {
  @IsNotEmpty({ message: 'El tipo de cita es obligatorio' })
  @IsNumber()
  tipo_cita_id: number;

  @IsNotEmpty({ message: 'El paciente es obligatorio' })
  @IsNumber()
  paciente_id: number;

  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @IsNumber()
  motivo_id: number;

  @IsNotEmpty({ message: 'El estado es obligatorio' })
  @IsNumber()
  estado_id: number;

  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  @IsString()
  fecha: string;

  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  @IsString()
  hora_inicio: string;

  @IsNotEmpty({ message: 'La duración es obligatoria' })
  @IsNumber()
  duracion_minutos: number;

  @IsOptional()
  @IsString()
  nota?: string;

  @IsOptional()
  @IsNumber()
  user_id?: number;

  // CITA NORMAL (tipo_cita_id = 1)
  @IsOptional()
  @IsNumber()
  doctor_id?: number;

  @IsOptional()
  @IsNumber()
  servicio_id?: number;

  // REUNIÓN CLÍNICA (tipo_cita_id = 2)
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  terapeutas_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  servicios_ids?: number[];

  // VISITA ESCOLAR (tipo_cita_id = 3)
  @IsOptional()
  @ValidateNested()
  @Type(() => EncargadoDto)
  encargado?: EncargadoDto;

  @IsOptional()
  @IsNumber()
  firma_documento?: number;
}