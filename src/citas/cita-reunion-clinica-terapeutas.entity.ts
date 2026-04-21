import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CitaReunionClinica } from './cita-reunion-clinica.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

@Entity('cita_reunion_clinica_terapeutas')
export class CitaReunionClinicaTerapeutas {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  id_reunion: number;

  @ManyToOne(() => CitaReunionClinica, reunion => reunion.terapeutas)
  @JoinColumn({ name: 'id_reunion' })
  reunion: CitaReunionClinica;

  @Column({ type: 'int' })
  id_terapeuta: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'id_terapeuta' })
  terapeuta: TrabajadorCentro;

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
