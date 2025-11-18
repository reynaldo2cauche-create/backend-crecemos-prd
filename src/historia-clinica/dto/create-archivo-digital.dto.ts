import { IsNumber, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateArchivoDigitalDto {
  @IsInt()
  @Min(1)
  terapeutaId: number;

  @IsInt()
  @Min(1)
  tipoArchivoId: number;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  nombreArchivo: string;

  @IsString()
  nombreOriginal: string;

  @IsString()
  tipoMime: string;

  @IsNumber()
  tamano: number;

  @IsString()
  rutaArchivo: string;

  @IsInt()
  @IsOptional()
  pacienteId?: number;

  @IsOptional()
  requiereVerificacion?: 'TERAPIA' | 'OFICIAL';
}
