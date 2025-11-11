// ============================================
// src/dto/crear-archivo-terapia.dto.ts
// ============================================
import { IsInt, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearArchivoTerapiaDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty({ message: 'El pacienteId es requerido' })
  pacienteId: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty({ message: 'El tipoArchivoId es requerido' })
  tipoArchivoId: number;

  @IsInt()
  @Type(() => Number)
  @IsIn([0, 1], { message: 'esCompartido debe ser 0 o 1' })
  @IsOptional()
  esCompartido?: number;

  @IsString()
  @IsOptional()
  descripcion?: string;
}
