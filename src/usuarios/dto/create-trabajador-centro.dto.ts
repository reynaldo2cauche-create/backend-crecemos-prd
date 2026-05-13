import { IsString, IsNumber, IsOptional, IsEmail, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

const toNumber = ({ value }) =>
  value !== undefined && value !== '' && value !== null ? Number(value) : undefined;

export class CreateTrabajadorCentroDto {
  @IsString()
  nombres: string;

  @IsString()
  apellidos: string;

  @IsString()
  dni: string;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsEmail()
  correo_corporativo?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  rol_id?: number;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  institucion_id?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  especialidad_id?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  cargo_id?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  jefe_id?: number;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  telefono_emergencia?: string;

  @IsOptional()
  @IsString()
  contacto_emergencia?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  distrito?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  talla_polo?: string;

  @IsOptional()
  @IsString()
  talla_pantalon?: string;

  @IsOptional()
  @IsString()
  talla_zapatos?: string;

  @IsOptional()
  @IsString()
  numero_colegiatura?: string;

  // Datos personales adicionales
  @IsOptional()
  @IsString()
  fecha_nacimiento?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  sexo_id?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  estado_civil_id?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  hijos?: number;

  // Datos de contacto adicionales
  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  referencia_direccion?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  parentesco_emergencia_id?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  distrito_id?: number;

  // Datos laborales adicionales
  @IsOptional()
  @IsString()
  procedencia_laboral?: string;

  @IsOptional()
  @IsString()
  area_laboral?: string;

  @IsOptional()
  @IsString()
  empresa_anterior?: string;

  @IsOptional()
  @IsString()
  motivo_renuncia?: string;

  // Datos adicionales
  @IsOptional()
  @IsString()
  hobbies?: string;

  @IsOptional()
  @IsString()
  opciones_regalo?: string;

  // Datos académicos principales
  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  nivel_educacion_id?: number;

  @IsOptional()
  @IsString()
  centro_estudios_principal?: string;

  @IsOptional()
  @IsString()
  carrera_estudiada_principal?: string;

  @IsOptional()
  @IsString()
  fecha_inicio_estudio?: string;

  @IsOptional()
  @IsString()
  fecha_termino_estudio?: string;

  // Archivos adjuntos
  @IsOptional()
  @IsString()
  archivo_cv?: string;

  @IsOptional()
  @IsString()
  archivo_dni?: string;

  // Campos de RRHH
  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  sueldo_base?: number;

  @IsOptional()
  @IsString()
  fecha_ingreso?: string;

  @IsOptional()
  @IsString()
  numero_cuenta?: string;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  user_id_actua?: number;
}
