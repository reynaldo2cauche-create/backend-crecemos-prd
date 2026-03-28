import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { HistorialCita } from './historial-cita.entity';
import { Servicios } from '../../catalogos/servicios.entity';

@Entity('historial_citas_reunion_servicios')
export class HistorialCitaReunionServicios {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'historial_cita_id' })
  historial_cita_id: number;

  @ManyToOne(() => HistorialCita, h => h.servicios)
  @JoinColumn({ name: 'historial_cita_id' })
  historialCita: HistorialCita;

  @Column({ type: 'int', name: 'servicio_id' })
  servicio_id: number;

  @ManyToOne(() => Servicios)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
