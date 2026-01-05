import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { MotivoCita } from '../../catalogos/motivo-cita.entity';
import { EstadoCita } from '../../catalogos/estado-cita.entity';
import { CitaReunionClinicaTerapeutas } from './cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './cita-reunion-clinica-servicios.entity';

/**
 * Entidad para REUNIONES CLÍNICAS
 * Permite múltiples terapeutas y múltiples servicios
 *
 * NOTA: Esta entidad refleja solo las columnas que existen en la BD.
 * Según el SQL, solo tiene: id, estado_cita_id, user_id_crea, user_id_actua, fecha_actua, created_at, updated_at
 */
@Entity('cita_reunion_clinica')
export class CitaReunionClinica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  estado_cita_id: number;

  @ManyToOne(() => EstadoCita)
  @JoinColumn({ name: 'estado_cita_id' })
  estado: EstadoCita;

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
