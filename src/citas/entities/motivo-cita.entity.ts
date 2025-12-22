import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TipoCita } from './tipo-cita.entity';

@Entity('motivo_cita')
export class MotivoCita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tipo_cita_id: number;

  @ManyToOne(() => TipoCita)
  @JoinColumn({ name: 'tipo_cita_id' })
  tipoCita: TipoCita;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
