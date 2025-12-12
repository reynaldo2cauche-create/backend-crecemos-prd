import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { HistorialCita } from './historial-cita.entity';

@Entity('historial_cita_terapeutas')
export class HistorialCitaTerapeuta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  historial_cita_id: number;

  @Column({ type: 'int' })
  terapeuta_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  rol_en_cita: string;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => HistorialCita, historial => historial.terapeutas)
  @JoinColumn({ name: 'historial_cita_id' })
  historial: HistorialCita;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;
}
