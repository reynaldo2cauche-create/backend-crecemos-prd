// src/convenios/dto/create-beneficio.dto.ts
import { IsString, IsOptional, IsBoolean, MaxLength, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateBeneficioDto {
  @ApiProperty({ description: 'Nombre del beneficio' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ description: 'Descripción del beneficio', required: false })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? null : value)
  descripcion?: string;

  @ApiProperty({ description: 'ID de la categoría del beneficio', required: false })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value === '' || value === null ? null : Number(value))
  categoria_id?: number | null;

  @ApiProperty({ description: 'Descuento del beneficio', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Transform(({ value }) => value === '' ? null : value)
  descuento?: string;

  @ApiProperty({ description: 'ID del convenio (empresa)', required: true })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  convenio_id: number;

  @ApiProperty({ description: 'Estado del beneficio', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
