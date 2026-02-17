import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn
} from 'typeorm';
import { Sorteo } from './sorteo.entity';
import { TipoCompra } from './tipo-compra.entity';
import { Paquete } from './paquete.entity';

@Entity('reglas_sorteo')
export class ReglaSorteo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'sorteo_id' })
  sorteoId: number;

  @ManyToOne(() => Sorteo, sorteo => sorteo.reglas)
  @JoinColumn({ name: 'sorteo_id' })
  sorteo: Sorteo;

  @Column({ type: 'int', name: 'tipo_compra_id' })
  tipoCompraId: number;

  @ManyToOne(() => TipoCompra)
  @JoinColumn({ name: 'tipo_compra_id' })
  tipoCompra: TipoCompra;

  @Column({ type: 'int', name: 'paquete_id', nullable: true })
  paqueteId: number;

  @ManyToOne(() => Paquete, { nullable: true })
  @JoinColumn({ name: 'paquete_id' })
  paquete: Paquete;

  @Column({ type: 'int', name: 'opciones_por_unidad' })
  opcionesPorUnidad: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
