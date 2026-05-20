import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { TareaPrioridad } from './tarea-prioridad.entity';
import { TareaColumna } from './tarea-columna.entity';
import { TareaAsignacion } from './tarea-asignacion.entity';
import { TareaComentario } from './tarea-comentario.entity';
import { TareaArchivo } from './tarea-archivo.entity';

@Entity('tareas')
export class Tarea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ default: 2 })
  prioridad_id: number;

  @ManyToOne(() => TareaPrioridad, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'prioridad_id' })
  prioridad: TareaPrioridad;

  @Column({ default: 1 })
  columna_id: number;

  @ManyToOne(() => TareaColumna, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'columna_id' })
  columna: TareaColumna;

  @Column({ type: 'datetime', nullable: true })
  fecha_limite: Date;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'int', default: 0 })
  tiempo_acumulado: number;

  @Column({ default: false })
  timer_activo: boolean;

  @Column({ type: 'datetime', nullable: true })
  timer_inicio: Date;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_crea_id' })
  user_crea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_actua_id' })
  user_actua: TrabajadorCentro;

  @OneToMany(() => TareaAsignacion, a => a.tarea, { cascade: true, eager: true })
  asignaciones: TareaAsignacion[];

  @OneToMany(() => TareaComentario, c => c.tarea, { cascade: true })
  comentarios: TareaComentario[];

  @OneToMany(() => TareaArchivo, a => a.tarea, { cascade: true, eager: true })
  archivos: TareaArchivo[];

  @Column({ default: false })
  archivado: boolean;

  @Column({ type: 'datetime', nullable: true })
  fecha_completado: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
