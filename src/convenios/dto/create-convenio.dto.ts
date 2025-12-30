// src/convenios/dto/create-convenio.dto.ts
import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConvenioDto {
  @ApiProperty({ description: 'Nombre de la empresa', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  empresa: string;

  @ApiPropertyOptional({ description: 'Descripción del convenio' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'URL del logo', maxLength: 500 })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo', default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
