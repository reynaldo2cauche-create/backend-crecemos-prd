import { IsEnum } from 'class-validator';

export class MarcarEntregaArchivoOficialDto {
  @IsEnum(['fisico', 'digital'], { message: 'tipo_entrega debe ser "fisico" o "digital"' })
  tipoEntrega: 'fisico' | 'digital';
}
