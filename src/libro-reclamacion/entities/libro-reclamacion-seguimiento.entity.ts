import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LibroReclamacion } from './libro-reclamacion.entity';

@Entity('libro_reclamaciones_seguimiento')
export class LibroReclamacionSeguimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column() reclamo_id: number;
  @Column({ nullable: true }) estado_anterior: string;
  @Column() estado_nuevo: string;
  @Column({ type: 'text', nullable: true }) observacion: string;
  @Column({ nullable: true }) usuario_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_cambio: Date;

  @ManyToOne(() => LibroReclamacion, reclamo => reclamo.seguimientos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reclamo_id' })
  reclamo: LibroReclamacion;
}
