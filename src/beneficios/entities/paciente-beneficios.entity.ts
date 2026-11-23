import { Entity, PrimaryColumn, Column } from 'typeorm';

/** Resumen de puntos por paciente (lectura rápida; se deriva del ledger). */
@Entity('paciente_beneficios')
export class PacienteBeneficios {
  @PrimaryColumn({ type: 'int' })
  paciente_id: number;

  @Column({ type: 'int', default: 0, comment: 'Puntos vigentes (no vencidos)' })
  saldo_puntos: number;

  @Column({ type: 'int', default: 0, comment: 'Total acumulado histórico' })
  puntos_historicos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Residuo < S/1' })
  fraccion_acumulada: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
