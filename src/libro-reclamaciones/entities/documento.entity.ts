import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LibroReclamacion } from './reclamo.entity';

@Entity('libro_reclamaciones_documentos')
export class LibroReclamacionesDocumento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  reclamo_id: number;

  @ManyToOne(() => LibroReclamacion, reclamo => reclamo.documentos)
  @JoinColumn({ name: 'reclamo_id' })
  reclamo: LibroReclamacion;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre_original: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ruta_archivo: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime: string;

  @Column({ type: 'int', nullable: true })
  tamaño: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha_subida: Date;
}
