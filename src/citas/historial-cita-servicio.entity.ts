import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Servicios } from '../catalogos/servicios.entity';
import { HistorialCita } from './historial-cita.entity';

@Entity('historial_cita_servicios')
export class HistorialCitaServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  historial_cita_id: number;

  @Column({ type: 'int' })
  servicio_id: number;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => HistorialCita, historial => historial.servicios)
  @JoinColumn({ name: 'historial_cita_id' })
  historial: HistorialCita;

  @ManyToOne(() => Servicios, { eager: true })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;
}
