import { IsNumber, IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateFichaSeguimientoDto {
  @ApiProperty({ description: 'ID del paciente (estudiante)' })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  paciente_id: number;

  @ApiProperty({ description: 'Periodo de observación (ej. "Octubre 2026")', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }) => (value === '' ? null : value))
  periodo_observacion?: string;

  @ApiProperty({ description: 'Fecha de entrega a la docente (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  fecha_entrega?: string;

  @ApiProperty({ description: 'Fecha de devolución (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  fecha_devolucion?: string;

  @ApiProperty({ description: 'ID del usuario que genera la solicitud', required: false })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? null : Number(value)))
  user_id_crea?: number;
}
