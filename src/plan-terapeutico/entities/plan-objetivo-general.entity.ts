import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('plan_objetivo_general')
export class PlanObjetivoGeneral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  plan_id: number;

  @Column({ type: 'int' })
  area_id: number;

  @Column({ type: 'int', nullable: true })
  frecuencia_id: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'int', nullable: true })
  plazo_sesiones: number;

  @Column({ type: 'date', nullable: true })
  fecha_inicio: string;

  @Column({ type: 'date', nullable: true })
  fecha_logro_est: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'int', nullable: true })
  user_id_actua: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updated_at: Date;
}
