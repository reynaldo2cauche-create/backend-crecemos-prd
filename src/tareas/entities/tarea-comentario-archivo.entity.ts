import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { TareaComentario } from './tarea-comentario.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('tarea_comentario_archivos')
export class TareaComentarioArchivo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  comentario_id: number;

  @ManyToOne(() => TareaComentario, c => c.archivos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comentario_id' })
  comentario: TareaComentario;

  @Column({ length: 255 })
  nombre_original: string;

  @Column({ length: 255 })
  nombre_guardado: string;

  @Column({ length: 500 })
  url: string;

  @Column({ length: 100, nullable: true })
  tipo_mime: string;

  @Column({ nullable: true })
  tamanio: number;

  @Column({ nullable: true })
  user_crea_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_crea_id' })
  user_crea: TrabajadorCentro;

  @CreateDateColumn()
  created_at: Date;
}
