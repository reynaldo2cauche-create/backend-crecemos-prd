import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CitaReunionClinica } from './cita-reunion-clinica.entity';
import { Servicios as Servicio } from '../../catalogos/servicios.entity';

@Entity('cita_reunion_clinica_servicios')
export class CitaReunionClinicaServicios {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'id_reunion' })
  id_reunion: number;

  @ManyToOne(() => CitaReunionClinica, reunion => reunion.servicios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_reunion' })
  reunion: CitaReunionClinica;

  @Column({ type: 'int', name: 'id_servicio' })
  id_servicio: number;

  @ManyToOne(() => Servicio)
  @JoinColumn({ name: 'id_servicio' })
  servicio: Servicio;

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
