import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TipoCita } from './tipo-cita.entity';

@Entity('motivo_cita')
export class MotivoCita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int' })
  tipo_cita_id: number;

  @ManyToOne(() => TipoCita, { eager: false })
  @JoinColumn({ name: 'tipo_cita_id' })
  tipoCita: TipoCita;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
