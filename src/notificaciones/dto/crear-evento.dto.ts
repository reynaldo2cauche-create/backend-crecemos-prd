export class CrearEventoDto {
  tipo_evento: string;
  descripcion: string;
  usuario_id: number;
  ip?: string;
  dispositivo?: string;
  datos_adicionales?: any; // Será convertido a JSON string
}
