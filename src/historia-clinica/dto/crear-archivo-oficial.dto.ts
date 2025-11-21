// src/archivos/dto/crear-archivo-oficial.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearArchivoOficialDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  @ValidateIf((o) => !o.trabajadorId)
  @IsNotEmpty({ message: 'Debe seleccionar un paciente o un trabajador' })
  pacienteId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  @ValidateIf((o) => !o.pacienteId)
  @IsNotEmpty({ message: 'Debe seleccionar un paciente o un trabajador' })
  trabajadorId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  terapeutaId?: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty({ message: 'El tipoArchivoId es requerido' })
  tipoArchivoId: number;

  @IsDateString({}, { message: 'La fechaEmision debe ser una fecha válida (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'La fechaEmision es requerida' })
  fechaEmision: string;

  @IsDateString({}, { message: 'La fechaVigencia debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  fechaVigencia?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  codigoManual?: string;
}