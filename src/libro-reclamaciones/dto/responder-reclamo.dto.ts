import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class ResponderReclamoDto {
  @IsString()
  @IsNotEmpty()
  respuesta_proveedor: string;

  @IsInt()
  @IsNotEmpty()
  usuario_id: number;
}
