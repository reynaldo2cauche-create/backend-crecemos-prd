import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { CompraReposicionDetalle } from './compra-reposicion-detalle.entity';

@Entity('compra_reposicion')
export class CompraReposicion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'proveedor_id' })
  proveedor_id: number;

  @ManyToOne(() => Proveedor)
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ type: 'date' })
  fecha_compra: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total: number;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => CompraReposicionDetalle, (d) => d.compra, { cascade: true })
  detalles: CompraReposicionDetalle[];
}
