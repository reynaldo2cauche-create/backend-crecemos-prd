import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('plan_estado')
export class PlanEstado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  codigo: string;

  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;
}
