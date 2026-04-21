import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Promocion } from './promocion.entity';
import { TipoCondicionPromo } from './tipo-condicion-promo.entity';
import { TipoBeneficioPromo } from './tipo-beneficio-promo.entity';
import { Producto } from '../../inventario/entities/producto.entity';

@Entity('promocion_regla')
export class PromocionRegla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  promocion_id: number;

  @ManyToOne(() => Promocion, (promocion) => promocion.reglas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'promocion_id' })
  promocion: Promocion;

  @Column({ type: 'tinyint', unsigned: true })
  condicion_tipo_id: number;

  @ManyToOne(() => TipoCondicionPromo)
  @JoinColumn({ name: 'condicion_tipo_id' })
  condicion_tipo: TipoCondicionPromo;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Ej: 3 (unidades) o 100.00 (monto mínimo)',
  })
  condicion_valor: number;

  @Column({ type: 'tinyint', unsigned: true })
  beneficio_tipo_id: number;

  @ManyToOne(() => TipoBeneficioPromo)
  @JoinColumn({ name: 'beneficio_tipo_id' })
  beneficio_tipo: TipoBeneficioPromo;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Para descuento % o monto fijo. NULL si no aplica',
  })
  beneficio_valor: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Solo si beneficio_tipo_id = 4 (Producto de regalo)',
  })
  beneficio_producto_id: number;

  @ManyToOne(() => Producto, { nullable: true })
  @JoinColumn({ name: 'beneficio_producto_id' })
  beneficio_producto: Producto;
}
