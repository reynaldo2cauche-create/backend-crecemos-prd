import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PacienteServicio } from './paciente-servicio.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

@Entity('asignacion_terapeuta')
export class AsignacionTerapeuta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PacienteServicio, pacienteServicio => pacienteServicio.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_servicio_id' })
  pacienteServicio: PacienteServicio;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;

  @Column({ type: 'date' })
  fecha_asignacion: Date;

  @Column({ type: 'date', nullable: true })
  fecha_fin: Date;

  @Column({ default: 'ACTIVO' })
  estado: string; // ACTIVO, INACTIVO, FINALIZADO

  @Column({ nullable: true })
  observaciones: string;

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