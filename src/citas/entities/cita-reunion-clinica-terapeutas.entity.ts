import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CitaReunionClinica } from './cita-reunion-clinica.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('cita_reunion_clinica_terapeutas')
export class CitaReunionClinicaTerapeutas {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  reunion_id: number;

  @ManyToOne(() => CitaReunionClinica, reunion => reunion.terapeutas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reunion_id' })
  reunion: CitaReunionClinica;

  @Column({ type: 'int' })
  terapeuta_id: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;

  @Column({ type: 'boolean', default: false })
  es_coordinador: boolean;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
