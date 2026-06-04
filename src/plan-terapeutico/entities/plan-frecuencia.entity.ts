import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('plan_frecuencia')
export class PlanFrecuencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;
}
