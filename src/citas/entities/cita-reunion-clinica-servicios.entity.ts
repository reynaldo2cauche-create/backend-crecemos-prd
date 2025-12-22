import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CitaReunionClinica } from './cita-reunion-clinica.entity';
import { Servicios as Servicio } from '../../catalogos/servicios.entity';

@Entity('cita_reunion_clinica_servicios')
export class CitaReunionClinicaServicios {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  reunion_id: number;

  @ManyToOne(() => CitaReunionClinica, reunion => reunion.servicios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reunion_id' })
  reunion: CitaReunionClinica;

  @Column({ type: 'int' })
  servicio_id: number;

  @ManyToOne(() => Servicio)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicio;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
