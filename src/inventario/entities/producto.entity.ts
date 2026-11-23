import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { CategoriaProducto } from './categoria-producto.entity';
import { Proveedor } from './proveedor.entity';
import { TipoProducto } from './tipo-producto.entity';

@Entity('producto')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'categoria_id' })
  categoria_id: number;

  @ManyToOne(() => CategoriaProducto, (cat) => cat.productos)
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaProducto;

  @Column({ nullable: true, name: 'proveedor_id' })
  proveedor_id: number;

  @ManyToOne(() => Proveedor, (prov) => prov.productos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ length: 150 })
  nombre: string;

  @Column({ name: 'tipo_producto_id', default: 1 })
  tipo_producto_id: number;

  @ManyToOne(() => TipoProducto)
  @JoinColumn({ name: 'tipo_producto_id' })
  tipo_producto: TipoProducto;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  precio_compra: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio_venta: number;

  @Column({ type: 'int', default: 0 })
  stock_actual: number;

  @Column({ type: 'int', default: 5, comment: 'Alerta cuando stock_actual <= stock_minimo' })
  stock_minimo: number;

  @Column({ length: 30, nullable: true, comment: 'Ej: unidad, caja, ml' })
  unidad_medida: string;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  // ── Crecemos Beneficios (canje por puntos) ──
  @Column({ type: 'tinyint', width: 1, default: 0, comment: '1 = producto canjeable por puntos' })
  es_canjeable: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagen_url: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo: string;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true, comment: 'Si NULL usa el global de beneficios_config' })
  porcentaje_recompensa: number;

  @Column({ type: 'int', default: 0, comment: 'Redondeado a múltiplo de 100' })
  puntos_necesarios: number;

  @Column({ type: 'tinyint', width: 1, default: 0, comment: '1 = admin fijó el puntaje a mano' })
  puntos_manual: number;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}