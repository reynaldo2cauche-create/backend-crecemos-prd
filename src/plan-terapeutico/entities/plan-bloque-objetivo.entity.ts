import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Asignación de un objetivo específico a un BLOQUE de sesiones.
 * Un bloque agrupa 4 sesiones (numero_bloque = floor((numero_sesion - 1) / 4) + 1).
 * Las 4 sesiones del bloque comparten los objetivos asignados; el resultado
 * se sigue registrando por sesión en plan_registro_sesion.
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
  numero_bloque: number;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updated_at: Date;
}
