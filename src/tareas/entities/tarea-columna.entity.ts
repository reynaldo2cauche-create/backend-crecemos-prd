import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('tarea_columnas')
export class TareaColumna {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 20, default: '#6b7280' })
  color: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ default: false })
  es_final: boolean;

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
