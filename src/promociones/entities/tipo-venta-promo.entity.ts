import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_venta_promo')
export class TipoVentaPromo {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;
}
