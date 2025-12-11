import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

@Entity('historial_cita_terapeutas')
export class HistorialCitaTerapeuta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  historial_cita_id: number;

  @Column({ type: 'int' })
  terapeuta_id: number;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;
}
