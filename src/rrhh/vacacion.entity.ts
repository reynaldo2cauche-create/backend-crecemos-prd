import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

@Entity('vacaciones')
export class Vacacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'trabajador_id' })
  empleado: TrabajadorCentro;

  @Column({ type: 'date', name: 'fechaInicio' })
  fechaSalida: Date;

  @Column({ type: 'date', name: 'fechaFin' })
  fechaRegreso: Date;

  @Column()
  diasTomados: number;

  @Column()
  periodoAnio: number;

  @Column({ default: 'pendiente' })
  estado: string;

  @Column({ nullable: true })
  observaciones: string;

  @Column({ nullable: true })
  aprobadoPor: number;

  @Column({ type: 'date', nullable: true })
  fechaAprobacion: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
