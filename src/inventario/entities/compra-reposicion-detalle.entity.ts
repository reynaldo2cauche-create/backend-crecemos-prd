import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CompraReposicion } from './compra-reposicion.entity';
import { Producto } from './producto.entity';

@Entity('compra_reposicion_detalle')
export class CompraReposicionDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'compra_id' })
  compra_id: number;

  @ManyToOne(() => CompraReposicion, (c) => c.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compra_id' })
  compra: CompraReposicion;

  @Column({ name: 'producto_id' })
  producto_id: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;
}
