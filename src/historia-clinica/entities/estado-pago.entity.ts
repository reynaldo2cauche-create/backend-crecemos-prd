import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('estado_pago')
export class EstadoPago {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, comment: 'Pendiente, Pagado, Anulado' })
  nombre: string;
}
