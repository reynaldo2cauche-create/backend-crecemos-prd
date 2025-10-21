import { IsOptional, IsNumber, IsString } from 'class-validator';

export class CerrarReclamoDto {
  @IsOptional()
  @IsNumber()
  usuarioId?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}