import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tarea } from './tarea.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { Rol } from '../../usuarios/rol.entity';

@Entity('tarea_asignaciones')
export class TareaAsignacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tarea_id: number;

  @ManyToOne(() => Tarea, t => t.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tarea_id' })
  tarea: Tarea;

  @Column({ nullable: true })
  usuario_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;

  @Column({ nullable: true })
  rol_id: number;

  @ManyToOne(() => Rol, { nullable: true, eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_crea_id' })
  user_crea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_actua_id' })
  user_actua: TrabajadorCentro;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
