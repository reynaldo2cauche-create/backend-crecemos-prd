import { IsString, IsOptional, IsNumber, IsBoolean, IsEmail, ValidateNested, IsObject, ValidateIf, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateParejaDto } from './create-pareja.dto';

export class PacienteDataDto {
  @IsString()
  nombres: string;

  @IsString()
  apellido_paterno: string;

  @IsString()
  apellido_materno: string;

  @IsString()
  fecha_nacimiento: string;

  @IsNumber()
  tipo_documento_id: number;

  @IsString()
  numero_documento: string;

  @IsNumber()
  sexo_id: number;

  @IsNumber()
  distrito_id: number;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  celular2?: string;

  @IsOptional()
  @ValidateIf((o) => o.correo !== '' && o.correo !== null && o.correo !== undefined)
  @IsEmail({}, { message: 'El correo debe ser válido si se proporciona' })
  correo?: string;

  @IsOptional()
  @IsString()
  diagnostico_medico?: string;

  @IsOptional()
  @IsString()
  alergias?: string;

  @IsOptional()
  @IsString()
  medicamentos_actuales?: string;
}

export class ServicioDataDto {
  @IsNumber()
  servicio_id: number;

  @IsOptional()
  @IsString()
  motivo_consulta?: string;

  @IsOptional()
  @IsString()
  referido_por?: string;
}

export class ResponsableDataDto {
  // 🆕 ID del responsable existente (evita duplicados)
  @IsOptional()
  @IsNumber()
  responsable_id?: number;

  // Si viene responsable_id, estos campos son opcionales
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellido_paterno?: string;

  @IsOptional()
  @IsString()
  apellido_materno?: string;

  @IsOptional()
  @IsNumber()
  tipo_documento_id?: number;

  @IsOptional()
  @IsString()
  numero_documento?: string;

  @IsNumber()
  relacion_id: number; // Siempre requerido

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  proceso_legal?: string;

  @IsOptional()
  @IsBoolean()
  tiene_proceso_legal?: boolean;

  @IsOptional()
  @IsNumber()
  proceso_legal_infantil_id?: number;
}

export class ConsentimientosDto {
  @IsBoolean()
  acepta_terminos: boolean;

  @IsBoolean()
  acepta_info_comercial: boolean;
}

export class MetadataDto {
  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @IsNumber()
  user_id: number;
}

export class CreatePacienteCompletoDto {
  @ValidateNested()
  @Type(() => PacienteDataDto)
  paciente: PacienteDataDto;

  @ValidateNested()
  @Type(() => ServicioDataDto)
  servicio: ServicioDataDto;

  // Soporte para responsable único (legacy) - mantener compatibilidad
  @IsOptional()
  @ValidateNested()
  @Type(() => ResponsableDataDto)
  responsable?: ResponsableDataDto;

  // Soporte para múltiples responsables (nuevo)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponsableDataDto)
  responsables?: ResponsableDataDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateParejaDto)
  pareja?: CreateParejaDto;

  @ValidateNested()
  @Type(() => ConsentimientosDto)
  consentimientos: ConsentimientosDto;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
} 