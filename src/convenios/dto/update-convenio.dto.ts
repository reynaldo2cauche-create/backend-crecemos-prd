// src/convenios/dto/update-convenio.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateConvenioDto } from './create-convenio.dto';

export class UpdateConvenioDto extends PartialType(CreateConvenioDto) {}

// src/convenios/dto/create-paciente-convenio.dto.ts
import { IsNumber, IsOptional, IsDateString, IsBoolean, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePacienteConvenioDto {
  @ApiProperty({ description: 'ID del paciente' })
  @IsNumber()
  paciente_id: number;

  @ApiProperty({ description: 'ID del convenio' })
  @IsNumber()
  convenio_id: number;

  @ApiPropertyOptional({ description: 'Fecha de inicio del convenio' })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin del convenio' })
  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo', default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}