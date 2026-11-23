import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type TipoMovimiento = 'ACUMULACION' | 'REVERSION' | 'CANJE' | 'VENCIMIENTO' | 'AJUSTE';

/**
 * Libro mayor (ledger) de puntos. Núcleo del programa.
 * - ACUMULACION: puntos>0, saldo_restante=puntos, fecha_vencimiento=+12m.
 * - CANJE/REVERSION/VENCIMIENTO: puntos<0 (consumen lotes FIFO; saldo_restante NULL).
 * Saldo del paciente = SUM(saldo_restante) de lotes ACUMULACION no vencidos y > 0.
 */
@Entity('puntos_movimiento')
export class PuntosMovimiento {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int' })
  paciente_id: number;

  @Column({ type: 'varchar', length: 20 })
  tipo: TipoMovimiento;

  @Column({ type: 'int', comment: 'Positivo acumula, negativo descuenta' })
  puntos: number;

  @Column({ type: 'int', nullable: true, comment: 'Solo lotes ACUMULACION (FIFO)' })
  saldo_restante: number | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha_generacion: Date;

  @Column({ type: 'date', nullable: true, comment: 'Solo acumulaciones: +12 meses' })
  fecha_vencimiento: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'VENTA_PAGO | CANJE | NC | AJUSTE' })
  origen_tipo: string | null;

  @Column({ type: 'bigint', nullable: true })
  origen_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
