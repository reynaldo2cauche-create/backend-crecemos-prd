import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PacienteServicio } from './paciente-servicio.entity';
import { TrabajadorCentro } from '../evaluaciones/trabajador-centro.entity';

@Entity('comentario_terapia')
export class ComentarioTerapia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PacienteServicio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_servicio_id' })
  pacienteServicio: PacienteServicio;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;

  @Column({ type: 'text' })
  comentario: string;

  @Column({ default: 'GENERAL' })
  tipo: string; // GENERAL, EVALUACION, PROGRESO, OBSERVACION

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