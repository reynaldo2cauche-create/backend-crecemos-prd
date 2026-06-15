import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Asignación de un objetivo específico a una SESIÓN concreta.
 * Los bloques de 4 sesiones siguen existiendo como agrupación visual, pero
 * cada sesión (día) elige sus propios objetivos de forma independiente; el
 * resultado se registra por sesión en plan_registro_sesion.
 * (La tabla conserva el nombre histórico plan_bloque_objetivo.)
 */
@Entity('plan_bloque_objetivo')
export class PlanBloqueObjetivo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  plan_id: number;

  @Column({ type: 'int' })
  objetivo_especifico_id: number;

  @Column({ type: 'int' })
  numero_sesion: number;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updated_at: Date;
}
