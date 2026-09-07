import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Solicitud } from './solicitud.entity';

/** Timeline de cada solicitud: creada, aprobada, rechazada, comentario. */
@Entity('solicitud_historial')
export class SolicitudHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Solicitud, (s) => s.historial, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: Solicitud;

  // creada | aprobada | rechazada | comentario
  @Column({ type: 'varchar', length: 40 })
  accion: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  estado: string | null;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({ type: 'int', nullable: true })
  user_id: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
