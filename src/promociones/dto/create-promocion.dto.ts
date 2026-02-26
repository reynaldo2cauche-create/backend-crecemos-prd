import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePromocionReglaDto } from './create-promocion-regla.dto';
import { CreatePromocionAlcanceDto } from './create-promocion-alcance.dto';

export class CreatePromocionDto {
  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  aplica_todo?: boolean;

  @IsDateString()
  fecha_inicio: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsOptional()
  @IsBoolean()
  flg_acumulable?: boolean;

  @IsOptional()
  @IsBoolean()
  flg_activo?: boolean;

  @IsOptional()
  @IsNumber()
  user_crea_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePromocionReglaDto)
  @ArrayMinSize(1)
  reglas: CreatePromocionReglaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePromocionAlcanceDto)
  alcances?: CreatePromocionAlcanceDto[];
}
