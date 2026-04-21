import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Paciente } from './paciente.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { AsignacionTerapeuta } from './asignacion-terapeuta.entity';

@Entity('paciente_servicio')
export class PacienteServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => Servicios)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ type: 'date' })
  fecha_inicio: Date;

  @Column({ type: 'date', nullable: true })
  fecha_fin: Date;

  @Column({ default: 'ACTIVO' })
  estado: string; // ACTIVO, INACTIVO, FINALIZADO

  @Column({ nullable: true })
  motivo_consulta: string;

  @Column({ nullable: true })
  observaciones: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => AsignacionTerapeuta, at => at.pacienteServicio)
  asignaciones: AsignacionTerapeuta[];

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