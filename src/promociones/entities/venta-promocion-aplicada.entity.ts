import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Promocion } from './promocion.entity';
import { TipoVentaPromo } from './tipo-venta-promo.entity';

@Entity('venta_promocion_aplicada')
export class VentaPromocionAplicada {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  promocion_id: number;

  @ManyToOne(() => Promocion)
  @JoinColumn({ name: 'promocion_id' })
  promocion: Promocion;

  @Column({
    type: 'tinyint',
    unsigned: true,
    comment: '1=venta_producto, 2=venta_servicio',
  })
  tipo_venta_id: number;

  @ManyToOne(() => TipoVentaPromo)
  @JoinColumn({ name: 'tipo_venta_id' })
  tipo_venta: TipoVentaPromo;

  @Column({
    type: 'int',
    comment: 'ID en venta_producto o venta_servicio según tipo_venta_id',
  })
  venta_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monto_ahorrado: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
