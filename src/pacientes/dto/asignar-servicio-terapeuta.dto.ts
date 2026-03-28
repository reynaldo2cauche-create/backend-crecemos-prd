// dto/asignar-servicio-terapeuta.dto.ts
import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AsignarServicioTerapeutaDto {
  @IsNumber()
  paciente_id: number;

  @IsNumber()
  servicio_id: number;

  @IsOptional()
  @IsNumber()
  terapeuta_id?: number;

  @IsOptional()
  // Esto valida ISO 8601 pero es flexible
  @Transform(({ value }) => {
    if (!value) return new Date().toISOString();
    // Si ya es un objeto Date, convertirlo a ISO string
    if (value instanceof Date) return value.toISOString();
    // Si es string, asegurarse que sea válido
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  })
  fecha_inicio?: string;

  @IsOptional()
  @IsString()
  motivo_consulta?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  activo?: boolean;
}