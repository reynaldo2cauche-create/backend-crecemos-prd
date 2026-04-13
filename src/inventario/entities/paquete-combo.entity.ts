import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { PaqueteComboItem } from './paquete-combo-item.entity';

@Entity('paquete_combo')
export class PaqueteCombo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_total' })
  precioTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'precio_tachado' })
  precioTachado: number;

  @Column({ type: 'tinyint', name: 'flg_activo', default: 1 })
  flgActivo: number;

  @Column({ nullable: true, name: 'user_crea_id' })
  user_crea_id: number;

  @Column({ nullable: true, name: 'user_actua_id' })
  user_actua_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_crea_id' })
  userCrea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_actua_id' })
  userActua: TrabajadorCentro;

  @OneToMany(() => PaqueteComboItem, (item) => item.paqueteCombo, { cascade: true })
  items: PaqueteComboItem[];
}
