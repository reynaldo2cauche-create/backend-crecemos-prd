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

@Entity('sorteo_ganadores')
export class SorteoGanador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'sorteo_id' })
  sorteoId: number;

  @ManyToOne(() => Sorteo, sorteo => sorteo.ganadores)
  @JoinColumn({ name: 'sorteo_id' })
  sorteo: Sorteo;

  @Column({ type: 'int', name: 'paciente_id' })
  pacienteId: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ type: 'int' })
  posicion: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
