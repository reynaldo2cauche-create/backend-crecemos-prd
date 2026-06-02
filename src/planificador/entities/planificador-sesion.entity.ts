import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('planificador_sesion')
export class PlanificadorSesion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  objetivo_id: number;

  @Column({ type: 'int' })
  bloque_id: number;

  @Column({ type: 'int' })
  numero_sesion: number;

  @Column({ type: 'int', nullable: true })
  cita_id: number;

  @Column({
    type: 'enum',
    enum: ['NO_LOGRADO', 'EN_PROCESO', 'LOGRADO'],
    nullable: true,
  })
  resultado: 'NO_LOGRADO' | 'EN_PROCESO' | 'LOGRADO';

  // Columna generada en la BD (STORED). Nunca se inserta/actualiza desde el ORM.
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    insert: false,
    update: false,
    default: 0,
  })
  puntaje: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'datetime', nullable: true })
  fecha_registro: Date;

  @Column({ type: 'int', nullable: true })
  registrado_por: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updated_at: Date;
}
