import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('plan_objetivo_especifico')
export class PlanObjetivoEspecifico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  objetivo_general_id: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  actividad_ejemplo: string;

  @Column({ type: 'text', nullable: true })
  materiales: string;

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
