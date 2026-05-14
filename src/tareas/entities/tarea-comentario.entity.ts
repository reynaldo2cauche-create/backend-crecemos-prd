import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tarea } from './tarea.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { TareaComentarioArchivo } from './tarea-comentario-archivo.entity';

@Entity('tarea_comentarios')
export class TareaComentario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tarea_id: number;

  @ManyToOne(() => Tarea, t => t.comentarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tarea_id' })
  tarea: Tarea;

  @Column({ type: 'text' })
  contenido: string;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_crea_id' })
  user_crea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_actua_id' })
  user_actua: TrabajadorCentro;

  @OneToMany(() => TareaComentarioArchivo, a => a.comentario, { cascade: true, eager: true })
  archivos: TareaComentarioArchivo[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
