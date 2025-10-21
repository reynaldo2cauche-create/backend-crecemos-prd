import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LibroReclamacion } from './libro-reclamacion.entity';

@Entity('libro_reclamaciones_documentos')
export class LibroReclamacionDocumento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column() reclamo_id: number;
  @Column() nombre_archivo: string;
  @Column() nombre_original: string;
  @Column() tipo_mime: string;
  @Column({ type: 'bigint' }) tamano: number;
  @Column() ruta_archivo: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_subida: Date;

  @Column({ type: 'tinyint', default: 1 })
  activo: number;

  @ManyToOne(() => LibroReclamacion, reclamo => reclamo.documentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reclamo_id' })
  reclamo: LibroReclamacion;
}
