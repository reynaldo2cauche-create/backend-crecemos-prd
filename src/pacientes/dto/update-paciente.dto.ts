import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdatePacienteDto {
  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellido_paterno?: string;

  @IsOptional()
  @IsString()
  apellido_materno?: string;

  @IsOptional()
  fecha_nacimiento?: Date;

  @IsOptional()
  @IsNumber()
  tipo_documento_id?: number;

  @IsOptional()
  @IsString()
  numero_documento?: string;

  @IsOptional()
  @IsNumber()
  sexo_id?: number;

  @IsOptional()
  @IsNumber()
  distrito_id?: number;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsNumber()
  servicio_id?: number;

  @IsOptional()
  @IsString()
  motivo_consulta?: string;

  @IsOptional()
  @IsString()
  referido_por?: string;

  @IsOptional()
  @IsString()
  responsable_nombre?: string;

  @IsOptional()
  @IsString()
  responsable_apellido_paterno?: string;

  @IsOptional()
  @IsString()
  responsable_apellido_materno?: string;

  @IsOptional()
  @IsNumber()
  responsable_tipo_documento_id?: number;

  @IsOptional()
  @IsString()
  responsable_numero_documento?: string;

  @IsOptional()
  @IsNumber()
  responsable_relacion_id?: number;

  @IsOptional()
  @IsString()
  responsable_telefono?: string;

  @IsOptional()
  @IsString()
  responsable_email?: string;

  @IsOptional()
  @IsString()
  diagnostico_medico?: string;

  @IsOptional()
  @IsString()
  alergias?: string;

  @IsOptional()
  @IsString()
  medicamentos_actuales?: string;

  @IsOptional()
  @IsBoolean()
  acepta_terminos?: boolean;

  @IsOptional()
  @IsBoolean()
  acepta_info_comercial?: boolean;

  @IsOptional()
  @IsNumber()
  estado_paciente_id?: number;

  @IsNumber()
  user_id: number;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  celular2?: string;

  @IsOptional()
  @IsString()
  correo?: string;
} 