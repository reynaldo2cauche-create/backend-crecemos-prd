import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { HistorialCita } from './historial-cita.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('historial_citas_reunion_terapeutas')
export class HistorialCitaReunionTerapeutas {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'historial_cita_id' })
  historial_cita_id: number;

  @ManyToOne(() => HistorialCita, h => h.terapeutas)
  @JoinColumn({ name: 'historial_cita_id' })
  historialCita: HistorialCita;

  @Column({ type: 'int', name: 'terapeuta_id' })
  terapeuta_id: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
