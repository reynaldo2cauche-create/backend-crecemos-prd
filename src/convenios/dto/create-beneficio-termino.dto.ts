// src/convenios/dto/create-beneficio-termino.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBeneficioTerminoDto {
  @ApiProperty({ description: 'ID del beneficio' })
  @IsNumber()
  @IsNotEmpty()
  beneficio_id: number;

  @ApiProperty({ description: 'Descripción del término o condición' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ description: 'Orden de visualización', required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  orden?: number;

  @ApiProperty({ description: 'Estado activo/inactivo', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
