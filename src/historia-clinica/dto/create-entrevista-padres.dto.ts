import { IsNumber, IsString, IsOptional, IsDateString, IsBoolean, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class HermanoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  edad: number;

  @IsNumber()
  sexo: number;
}

class FamiliarDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsNumber()
  edad: number;

  @IsNumber()
  ocupacion: number;
}

export class CreateEntrevistaPadresDto {
  @IsNumber()
  @IsNotEmpty()
  paciente_id: number;

  @IsNumber()
  @IsNotEmpty()
  usuario_id: number;

  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @IsNumber()
  @IsNotEmpty()
  escolaridad: number;

  @IsString()
  @IsNotEmpty()
  motivo_consulta: string;

  @IsNumber()
  @IsOptional()
  otras_atenciones?: number;

  @IsString()
  @IsNotEmpty()
  antecedentes_familiares: string;

  @IsString()
  @IsOptional()
  antecedentes_medicos?: string;

  @IsString()
  @IsOptional()
  antecedentes_psiquiatricos?: string;

  @IsString()
  @IsOptional()
  antecedentes_toxicologicos?: string;

  @IsNumber()
  @IsOptional()
  relacion_entre_padres?: number;

  @IsString()
  @IsOptional()
  detalle_relacion_padres?: string;

  @IsString()
  @IsNotEmpty()
  cantidad_hermanos: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HermanoDto)
  @IsOptional()
  hermanos?: HermanoDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FamiliarDto)
  @IsOptional()
  familiares?: FamiliarDto[];

  @IsString()
  @IsOptional()
  tiempo_juego?: string;

  @IsString()
  @IsOptional()
  tiempo_dispositivos?: string;

  @IsString()
  @IsOptional()
  antecedentes_prenatales?: string;

  @IsString()
  @IsOptional()
  desarrollo_motor?: string;

  @IsString()
  @IsOptional()
  desarrollo_lenguaje?: string;

  @IsString()
  @IsOptional()
  alimentacion?: string;

  @IsString()
  @IsOptional()
  sueno?: string;

  @IsString()
  @IsOptional()
  control_esfinteres?: string;

  @IsString()
  @IsOptional()
  antecedentes_medicos_nino?: string;

  @IsString()
  @IsOptional()
  antecedentes_escolares?: string;

  @IsString()
  @IsOptional()
  relacion_pares?: string;

  @IsString()
  @IsOptional()
  expresion_emocional?: string;

  @IsString()
  @IsOptional()
  relacion_autoridad?: string;

  @IsString()
  @IsOptional()
  juegos_preferidos?: string;

  @IsString()
  @IsOptional()
  actividades_favoritas?: string;

  @IsString()
  @IsOptional()
  recomendaciones?: string;
}