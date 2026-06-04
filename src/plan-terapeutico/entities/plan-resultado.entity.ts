import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('plan_resultado')
export class PlanResultado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  codigo: string;

  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  @Column({ type: 'int' })
  valor: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;
}
