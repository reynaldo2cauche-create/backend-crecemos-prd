import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { EstadoCita } from '../../catalogos/estado-cita.entity';
import { CitaReunionClinicaTerapeutas } from './cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './cita-reunion-clinica-servicios.entity';
import { Cita } from './cita.entity';

/**
 * Entidad para REUNIONES CLÍNICAS
 * Solo guarda info adicional. La cita principal está en tabla 'citas'
 */
@Entity('cita_reunion_clinica')
export class CitaReunionClinica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  id_cita: number;

  @ManyToOne(() => Cita, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cita' })
  cita: Cita;

  @Column({ type: 'int', name: 'estado_cita_id' })
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
