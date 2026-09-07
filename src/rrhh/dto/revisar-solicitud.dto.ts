import { IsNotEmpty, IsOptional, IsString, IsInt, IsIn } from 'class-validator';

export class RevisarSolicitudDto {
  // 'aprobado' | 'rechazado'
  @IsNotEmpty()
  @IsIn(['aprobado', 'rechazado'])
  estado: string;

  @IsOptional()
  @IsInt()
  revisorId?: number;

  @IsOptional()
  @IsString()
  comentarioRrhh?: string;
}
