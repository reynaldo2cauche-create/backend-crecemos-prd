import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/** Config global del programa (una sola fila, id=1). % de recompensa editable por gerencia. */
@Entity('beneficios_config')
export class BeneficiosConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 6, scale: 3, default: 1.0, comment: 'En %, ej 1.000 = 1%' })
  porcentaje_recompensa: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo: number;

  @Column({ type: 'int', nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
