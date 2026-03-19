import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CambiarEstadoDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  estado_id: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  usuario_id: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
