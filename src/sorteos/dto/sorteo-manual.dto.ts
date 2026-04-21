import { IsString, IsOptional, IsInt, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear un sorteo manual (sin reglas)
 */
export class CrearSorteoManualDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

/**
 * DTO para agregar un participante a un sorteo manual
 */
export class AgregarParticipanteDto {
  @IsInt()
  paciente_id: number;
}

/**
 * DTO para agregar múltiples participantes a un sorteo manual
 */
export class AgregarMultiplesParticipantesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  pacientes_ids: number[];
}

/**
 * Clase para un ganador individual
 */
export class GanadorDto {
  @IsInt()
  paciente_id: number;

  @IsInt()
  posicion: number;
}

/**
 * DTO para finalizar un sorteo manual (guardar ganadores)
 */
export class FinalizarSorteoManualDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GanadorDto)
  ganadores: GanadorDto[];
}
