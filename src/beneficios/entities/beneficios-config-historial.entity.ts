import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/** Historial de cambios del % de recompensa (trazabilidad de gerencia). */
@Entity('beneficios_config_historial')
export class BeneficiosConfigHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  porcentaje_anterior: number;

  @Column({ type: 'decimal', precision: 6, scale: 3 })
  porcentaje_nuevo: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo: string;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
