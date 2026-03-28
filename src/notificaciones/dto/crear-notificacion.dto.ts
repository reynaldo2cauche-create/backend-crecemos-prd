export class CrearNotificacionDto {
  tipo_notificacion: string;
  titulo: string;
  mensaje: string;
  evento_id: number;
  roles_destino: number[]; // IDs de los roles que recibirán la notificación
}
