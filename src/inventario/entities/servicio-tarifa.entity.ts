import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Servicios } from '../../catalogos/servicios.entity';   // ajusta la ruta
import { MotivoCita } from '../../catalogos/motivo-cita.entity';     // ajusta la ruta

@Entity('servicio_tarifa')

export class ServicioTarifa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'servicio_id' })
  servicio_id: number;

  @ManyToOne(() => Servicios)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ name: 'motivo_cita_id' })
  motivo_cita_id: number;

  @ManyToOne(() => MotivoCita)
  @JoinColumn({ name: 'motivo_cita_id' })
  motivo_cita: MotivoCita;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}