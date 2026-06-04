import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('plan_terapeutico')
export class PlanTerapeutico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  paciente_id: number;

  @Column({ type: 'int' })
  servicio_id: number;

  @Column({ type: 'int', nullable: true })
  terapeuta_id: number;

  @Column({ type: 'int' })
  estado_id: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  metodologia: string;

  @Column({ type: 'date', nullable: true })
  fecha_inicio: string;

  @Column({ type: 'int', default: 8 })
  revision_cada: number;

  @Column({ type: 'int', default: 24 })
  reunion_padres_cada: number;

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
