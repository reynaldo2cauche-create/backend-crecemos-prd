import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('plan_area')
export class PlanArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  servicio_id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;
}
