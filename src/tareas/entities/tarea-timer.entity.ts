import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tarea } from './tarea.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('tarea_timers')
export class TareaTimer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tarea_id: number;

  @ManyToOne(() => Tarea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tarea_id' })
  tarea: Tarea;

  @Column()
  usuario_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;

  @Column({ default: false })
  timer_activo: boolean;

  @Column({ type: 'datetime', nullable: true })
  timer_inicio: Date;

  @Column({ type: 'int', default: 0 })
  tiempo_acumulado: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
