import { IsNotEmpty, IsOptional, IsString, IsInt, IsIn } from 'class-validator';

export class RevisarSolicitudReprogramacionDto {
  // 'aprobada' | 'rechazada'
  @IsNotEmpty()
  @IsIn(['aprobada', 'rechazada'])
  estado: string;

  // Administrador que revisa (se usa como user_id_crea al aplicar el cambio)
  @IsOptional()
  @IsInt()
  revisor_id?: number;

  @IsOptional()
  @IsString()
  comentario?: string;
}
