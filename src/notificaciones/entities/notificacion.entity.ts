import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { EventoSistema } from './evento-sistema.entity';
import { NotificacionDestino } from './notificacion-destino.entity';

/**
 * Entidad para NOTIFICACIONES
 * Almacena las notificaciones generadas a partir de eventos
 */
@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 30 })
  tipo_notificacion: string; // ANIVERSARIO, CUMPLEANOS, ACCESO, CITA_ELIMINADA, CITA_MODIFICADA, NOTA_EVOLUCION

  @Column({ type: 'varchar', length: 100 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_creacion: Date;

  @Column({ type: 'bigint' })
  evento_id: number;

  @ManyToOne(() => EventoSistema)
  @JoinColumn({ name: 'evento_id' })
  evento: EventoSistema;

  @OneToMany(() => NotificacionDestino, destino => destino.notificacion)
  destinos: NotificacionDestino[];
}
