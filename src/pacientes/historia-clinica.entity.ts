import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PacienteServicio } from './paciente-servicio.entity';
import { TrabajadorCentro } from '../evaluaciones/trabajador-centro.entity';

@Entity('historia_clinica')
export class HistoriaClinica {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PacienteServicio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_servicio_id' })
  pacienteServicio: PacienteServicio;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;

  @Column({ type: 'date' })
  fecha_sesion: Date;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'time' })
  hora_fin: string;

  @Column({ type: 'text' })
  objetivo_sesion: string;

  @Column({ type: 'text' })
  actividades_realizadas: string;

  @Column({ type: 'text' })
  observaciones: string;

  @Column({ type: 'text', nullable: true })
  tareas_casa: string;

  @Column({ type: 'text', nullable: true })
  recomendaciones: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP'
  })
  created_at: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updated_at: Date;
} 