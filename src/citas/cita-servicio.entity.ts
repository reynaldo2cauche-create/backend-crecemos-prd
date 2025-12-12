import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Servicios } from '../catalogos/servicios.entity';
import { Cita } from './cita.entity';

@Entity('cita_servicios')
export class CitaServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cita_id: number;

  @Column({ type: 'int' })
  servicio_id: number;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number;

  @Column({ type: 'int', nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => Cita, cita => cita.servicios)
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;

  @ManyToOne(() => Servicios, { eager: true })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;
}