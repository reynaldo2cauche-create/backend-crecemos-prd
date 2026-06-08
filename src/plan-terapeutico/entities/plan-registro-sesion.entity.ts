import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('plan_registro_sesion')
export class PlanRegistroSesion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  objetivo_especifico_id: number;

  @Column({ type: 'int', nullable: true })
  resultado_id: number;

  @Column({ type: 'int' })
  numero_sesion: number;

  @Column({ type: 'int', nullable: true })
  cita_id: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'text', nullable: true })
  actividad: string;

  @Column({ type: 'text', nullable: true })
  materiales: string;

  @Column({ type: 'date', nullable: true })
  fecha: string;

  @Column({ type: 'int', nullable: true })
  registrado_por: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updated_at: Date;
}
