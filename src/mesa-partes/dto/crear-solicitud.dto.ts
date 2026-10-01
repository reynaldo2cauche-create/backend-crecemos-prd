import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CrearSolicitudDto {
  @IsOptional()
  @IsInt()
  paciente_id?: number;

  @IsInt()
  @IsNotEmpty()
  tipo_id: number;

  @IsOptional()
  @IsString()
  asunto?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  entregado_por_nombre: string;

  @IsOptional()
  @IsString()
  entregado_por_doc?: string;

  @IsOptional()
  @IsString()
  entregado_por_telefono?: string;

  // Recepción que registra (auditoría)
  @IsInt()
  @IsNotEmpty()
  user_crea_id: number;
}
