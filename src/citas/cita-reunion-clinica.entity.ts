import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { CitaReunionEstado } from './cita-reunion-estado.entity';
import { CitaReunionClinicaTerapeutas } from './cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './cita-reunion-clinica-servicios.entity';

@Entity('cita_reunion_clinica')
export class CitaReunionClinica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  id_estado: number;

  @ManyToOne(() => CitaReunionEstado, { eager: true })
  @JoinColumn({ name: 'id_estado' })
  estado: CitaReunionEstado;

  @OneToMany(() => CitaReunionClinicaTerapeutas, terapeuta => terapeuta.reunion)
  terapeutas: CitaReunionClinicaTerapeutas[];

  @OneToMany(() => CitaReunionClinicaServicios, servicio => servicio.reunion)
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
