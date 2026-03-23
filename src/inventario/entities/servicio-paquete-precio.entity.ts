import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServicioTarifa } from './servicio-tarifa.entity';
import { Paquete } from '../../catalogos/paquete.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('servicio_paquete_precio')
export class ServicioPaquetePrecio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'servicio_tarifa_id' })
  servicio_tarifa_id: number;

  @Column({ name: 'paquete_id' })
  paquete_id: number;

  @Column({
    type: 'enum',
    enum: ['precio_total', 'descuento_porcentaje'],
    name: 'tipo_calculo',
  })
  tipo_calculo: 'precio_total' | 'descuento_porcentaje';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'tinyint', default: 1, name: 'flg_activo' })
  flg_activo: number;

  @Column({ nullable: true, name: 'user_crea_id' })
  user_crea_id: number;

  @Column({ nullable: true, name: 'user_actua_id' })
  user_actua_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relaciones
  @ManyToOne(() => ServicioTarifa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'servicio_tarifa_id' })
  servicioTarifa: ServicioTarifa;

  @ManyToOne(() => Paquete, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paquete_id' })
  paquete: Paquete;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_crea_id' })
  userCrea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_actua_id' })
  userActua: TrabajadorCentro;
}
