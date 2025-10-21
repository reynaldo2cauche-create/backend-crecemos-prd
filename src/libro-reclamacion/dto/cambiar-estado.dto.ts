import { IsString, IsNotEmpty, IsIn, IsOptional, IsNumber } from 'class-validator';

export class CambiarEstadoDto {
  @IsString()
  @IsNotEmpty({ message: 'El estado es requerido' })
  @IsIn(['RECIBIDO', 'EN_REVISION', 'RESPONDIDO', 'CERRADO'], { 
    message: 'Estado inválido. Debe ser: RECIBIDO, EN_REVISION, RESPONDIDO o CERRADO' 
  })
  estado: string;

  @IsOptional()
  @IsNumber()
  usuarioId?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
