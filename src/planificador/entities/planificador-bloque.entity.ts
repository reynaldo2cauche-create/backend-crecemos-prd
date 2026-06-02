import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('planificador_bloque')
export class PlanificadorBloque {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  paciente_id: number;

  @Column({ type: 'int' })
  servicio_id: number;

  @Column({ type: 'int', nullable: true })
  terapeuta_id: number;

  @Column({ type: 'int' })
  numero_bloque: number;

  @Column({ type: 'int' })
  sesion_desde: number;

  @Column({ type: 'int' })
  sesion_hasta: number;

  @Column({ type: 'enum', enum: ['ABIERTO', 'CERRADO'], default: 'ABIERTO' })
  estado: 'ABIERTO' | 'CERRADO';

  @Column({ type: 'text', nullable: true })
  observacion_cierre: string;

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
