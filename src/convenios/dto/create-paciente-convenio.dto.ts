// src/convenios/dto/create-paciente-convenio.dto.ts
import { IsNumber, IsOptional, IsDateString, IsBoolean, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePacienteConvenioDto {
  @ApiProperty({ 
    description: 'ID del paciente',
    example: 1,
    type: Number 
  })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  paciente_id: number;

  @ApiProperty({ 
    description: 'ID del convenio',
    example: 1,
    type: Number 
  })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  convenio_id: number;

  @ApiPropertyOptional({ 
    description: 'Fecha de inicio del convenio',
    example: '2024-01-01',
    type: String 
  })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @ApiPropertyOptional({ 
    description: 'Fecha de fin del convenio',
    example: '2024-12-31',
    type: String 
  })
  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @ApiPropertyOptional({ 
    description: 'Estado activo/inactivo',
    default: true,
    example: true,
    type: Boolean 
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ 
    description: 'Observaciones adicionales',
    example: 'Convenio corporativo con descuento del 20%',
    type: String 
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
