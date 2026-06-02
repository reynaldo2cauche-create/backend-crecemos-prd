import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('planificador_objetivo')
export class PlanificadorObjetivo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  bloque_id: number;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  objetivo_especifico: string;

  @Column({ type: 'text', nullable: true })
  actividad_ejemplo: string;

  @Column({ type: 'text', nullable: true })
  materiales: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({
    type: 'enum',
    enum: ['PENDIENTE', 'LOGRADO', 'NO_LOGRADO'],
    default: 'PENDIENTE',
  })
  estado_logro: 'PENDIENTE' | 'LOGRADO' | 'NO_LOGRADO';

  @Column({ type: 'int', nullable: true })
  continuado_de_objetivo_id: number;

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
