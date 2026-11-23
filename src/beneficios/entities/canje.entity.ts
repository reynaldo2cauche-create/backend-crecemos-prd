import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/** Canje de un producto canjeable en recepción. Descuenta inventario + puntos. */
@Entity('canje')
export class Canje {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  paciente_id: number;

  @Column({ type: 'int', comment: 'FK lógica -> producto.id' })
  producto_id: number;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'int' })
  puntos_utilizados: number;

  @Column({ type: 'varchar', length: 20, default: 'ENTREGADO', comment: 'ENTREGADO | ANULADO' })
  estado: string;

  @Column({ type: 'int', nullable: true, comment: 'Quien atiende (recepción)' })
  colaborador_id: number | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo_anulacion: string | null;

  @Column({ type: 'int', nullable: true })
  anulado_por: number | null;

  @Column({ type: 'datetime', nullable: true })
  anulado_at: Date | null;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number | null;

  @Column({ type: 'int', nullable: true })
  user_actua_id: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
