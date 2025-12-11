import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// DTO para encargado de visita escolar
export class EncargadoDto {
  @IsNotEmpty()
  @IsString()
  nombre_completo: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  institucion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

// DTO principal para crear citas
export class CreateCitaDto {
  // ============ CAMPO OBLIGATORIO: TIPO DE CITA ============
  @IsNotEmpty({ message: 'El tipo de cita es obligatorio' })
  @IsNumber()
  tipo_cita_id: number;

  // ============ CAMPOS COMUNES ============
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

  // ============ CITA NORMAL (tipo_cita_id = 1) ============
  // Requiere: doctor_id, servicio_id
  @IsOptional()
  @IsNumber()
  doctor_id?: number;

  @IsOptional()
  @IsNumber()
  servicio_id?: number;

  // ============ REUNIÓN CLÍNICA (tipo_cita_id = 2) ============
  // Requiere: terapeutas_ids[], servicios_ids[]
  // Sin jerarquías, todos al mismo nivel
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  terapeutas_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  servicios_ids?: number[];

  // ============ VISITA ESCOLAR (tipo_cita_id = 3) ============
  // Requiere: encargado
  // Opcional: servicio_id
  @IsOptional()
  @ValidateNested()
  @Type(() => EncargadoDto)
  encargado?: EncargadoDto;
}
