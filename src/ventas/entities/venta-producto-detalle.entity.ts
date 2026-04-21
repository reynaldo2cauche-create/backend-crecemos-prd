import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VentaProducto } from './venta-producto.entity';
import { TipoDescuento } from './tipo-descuento.entity';
import { Producto } from '../../inventario/entities/producto.entity';

@Entity('venta_producto_detalle')
export class VentaProductoDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'venta_id' })
  venta_id: number;

  @ManyToOne(() => VentaProducto, (v) => v.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_id' })
  venta: VentaProducto;

  @Column({ name: 'producto_id' })
  producto_id: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio_unitario: number;

  @Column({ name: 'descuento_tipo_id', nullable: true, comment: 'Descuento por línea: 1=Porcentaje, 2=Monto fijo' })
  descuento_tipo_id: number;

  @ManyToOne(() => TipoDescuento, { nullable: true })
  @JoinColumn({ name: 'descuento_tipo_id' })
  descuento_tipo: TipoDescuento;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  descuento_valor: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  descuento_monto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '(precio_unitario * cantidad) - descuento_monto' })
  subtotal: number;
}
