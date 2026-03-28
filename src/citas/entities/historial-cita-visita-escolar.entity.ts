import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { HistorialCita } from './historial-cita.entity';

@Entity('historial_citas_visita_escolar')
export class HistorialCitaVisitaEscolar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'historial_cita_id' })
  historial_cita_id: number;

  @ManyToOne(() => HistorialCita, h => h.visitasEscolares)
  @JoinColumn({ name: 'historial_cita_id' })
  historialCita: HistorialCita;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre_colegio: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre_intermediario: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
