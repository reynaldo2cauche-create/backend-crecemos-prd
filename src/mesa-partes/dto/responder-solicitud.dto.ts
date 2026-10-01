import { IsString, IsNotEmpty, IsInt, IsIn } from 'class-validator';

export class ResponderSolicitudDto {
  // Resultado de la respuesta del administrador
  @IsString()
  @IsIn(['ATENDIDA', 'RECHAZADA'])
  resultado: 'ATENDIDA' | 'RECHAZADA';

  // Texto de respuesta o motivo del rechazo
  @IsString()
  @IsNotEmpty()
  respuesta: string;

  // Administrador que responde (auditoría)
  @IsInt()
  @IsNotEmpty()
  usuario_id: number;
}
