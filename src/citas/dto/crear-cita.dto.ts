import { IsInt, IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

export class CrearCitaDto {
  // Común para todos los tipos
  @IsInt()
  paciente_id: number;

  @IsInt()
  motivo_id: number;

  @IsInt()
  estado_id: number;

  @IsString()
  fecha: string;

  @IsString()
  hora_inicio: string;

  @IsOptional()
  @IsString()
  hora_fin?: string;

  @IsInt()
  duracion_minutos: number;

  @IsOptional()
  @IsString()
  nota?: string;

  // Para citas NORMALES
  @IsOptional()
  @IsInt()
  doctor_id?: number;

  @IsOptional()
  @IsInt()
  servicio_id?: number;

  // Para REUNIÓN CLÍNICA
  @IsOptional()
  @IsArray()
  terapeutas_ids?: number[];

  @IsOptional()
  @IsArray()
  servicios_ids?: number[];

  // Para VISITA ESCOLAR
  @IsOptional()
  @IsObject()
  encargado?: {
    nombre_completo: string;
    telefono: string;
    institucion: string;
  };

  @IsOptional()
  @IsBoolean()
  firma_documento?: boolean;

  @IsOptional()
  @IsInt()
  user_id_crea?: number;
}
