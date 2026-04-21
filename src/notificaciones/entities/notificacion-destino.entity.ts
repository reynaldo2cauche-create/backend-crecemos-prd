import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Notificacion } from './notificacion.entity';
import { Rol } from '../../usuarios/rol.entity';

/**
 * Entidad para NOTIFICACIONES_DESTINO
 * Relación muchos a muchos entre notificaciones y roles
 */
@Entity('notificaciones_destino')
export class NotificacionDestino {
  @PrimaryColumn({ type: 'bigint' })
  notificacion_id: number;

  @PrimaryColumn({ type: 'int' })
  rol_id: number;

  @ManyToOne(() => Notificacion, notificacion => notificacion.destinos)
  @JoinColumn({ name: 'notificacion_id' })
  notificacion: Notificacion;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;
}
