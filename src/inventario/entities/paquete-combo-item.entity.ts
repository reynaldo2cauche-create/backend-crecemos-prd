import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaqueteCombo } from './paquete-combo.entity';
import { ServicioTarifa } from './servicio-tarifa.entity';
import { DocumentoTarifa } from './documento-tarifa.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('paquete_combo_item')
export class PaqueteComboItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paquete_combo_id' })
  paqueteComboId: number;

  @ManyToOne(() => PaqueteCombo, (combo) => combo.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paquete_combo_id' })
  paqueteCombo: PaqueteCombo;

  @Column({ name: 'servicio_tarifa_id', nullable: true })
  servicioTarifaId: number;

  @ManyToOne(() => ServicioTarifa, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'servicio_tarifa_id' })
  servicioTarifa: ServicioTarifa;

  @Column({ name: 'documento_tarifa_id', nullable: true })
  documentoTarifaId: number;

  @ManyToOne(() => DocumentoTarifa, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'documento_tarifa_id' })
  documentoTarifa: DocumentoTarifa;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'descripcion_linea' })
  descripcionLinea: string;

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
}
