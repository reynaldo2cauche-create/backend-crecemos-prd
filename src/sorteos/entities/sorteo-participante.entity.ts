import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn
} from 'typeorm';
import { Sorteo } from './sorteo.entity';
import { Paciente } from '../../pacientes/paciente.entity';

@Entity('sorteo_participantes')
export class SorteoParticipante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'sorteo_id' })
  sorteoId: number;

  @ManyToOne(() => Sorteo)
  @JoinColumn({ name: 'sorteo_id' })
  sorteo: Sorteo;

  @Column({ type: 'int', name: 'paciente_id' })
  pacienteId: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  // Nota: Se eliminó el constraint UNIQUE para permitir duplicados
  // Un paciente puede estar múltiples veces en el mismo sorteo
}
