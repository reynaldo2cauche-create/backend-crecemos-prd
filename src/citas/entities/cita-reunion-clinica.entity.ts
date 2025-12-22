import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { MotivoCita } from './motivo-cita.entity';
import { EstadoCita } from './estado-cita.entity';
import { CitaReunionClinicaTerapeutas } from './cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './cita-reunion-clinica-servicios.entity';

/**
 * Entidad para REUNIONES CLÍNICAS
 * Permite múltiples terapeutas y múltiples servicios
 */
@Entity('cita_reunion_clinica')
export class CitaReunionClinica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  paciente_id: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ type: 'int' })
  motivo_id: number;

  @ManyToOne(() => MotivoCita)
  @JoinColumn({ name: 'motivo_id' })
  motivo: MotivoCita;

  @Column({ type: 'int' })
  estado_cita_id: number;

  @ManyToOne(() => EstadoCita)
  @JoinColumn({ name: 'estado_cita_id' })
  estado: EstadoCita;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'time', nullable: true })
  hora_fin: string;

  @Column({ type: 'int' })
  duracion_minutos: number;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ type: 'boolean', default: false })
  firma_documento: boolean;

  @OneToMany(() => CitaReunionClinicaTerapeutas, t => t.reunion, { cascade: true })
  terapeutas: CitaReunionClinicaTerapeutas[];

  @OneToMany(() => CitaReunionClinicaServicios, s => s.reunion, { cascade: true })
  servicios: CitaReunionClinicaServicios[];

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'int', nullable: true })
  user_id_actua: number;

  @Column({ type: 'timestamp', nullable: true })
  fecha_actua: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
