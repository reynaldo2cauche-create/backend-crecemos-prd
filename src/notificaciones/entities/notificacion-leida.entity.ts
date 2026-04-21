import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Notificacion } from './notificacion.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

/**
 * Entidad para NOTIFICACIONES_LEIDAS
 * Trackea qué usuario específico ha leído cada notificación
 */
@Entity('notificaciones_leidas')
@Index(['notificacion_id', 'usuario_id'], { unique: true })
export class NotificacionLeida {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  @Index()
  notificacion_id: number;

  @Column({ type: 'int', unsigned: true })
  @Index()
  usuario_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_lectura: Date;

  // Relaciones
  @ManyToOne(() => Notificacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificacion_id' })
  notificacion: Notificacion;

  @ManyToOne(() => TrabajadorCentro, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;
}
