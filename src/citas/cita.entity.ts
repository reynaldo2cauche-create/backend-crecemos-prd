import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { MotivoCita } from '../catalogos/motivo-cita.entity';
import { EstadoCita } from '../catalogos/estado-cita.entity';
import { TipoCita } from '../catalogos/tipo-cita.entity';

@Entity('citas')
export class Cita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tipo_cita_id: number;

  @ManyToOne(() => TipoCita, { eager: true })
  @JoinColumn({ name: 'tipo_cita_id' })
  tipo_cita: TipoCita;

  @Column({ type: 'int' })
  paciente_id: number;

  @ManyToOne(() => Paciente, { eager: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ type: 'int', nullable: true })
  doctor_id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: TrabajadorCentro;

  @Column({ type: 'int', nullable: true })
  servicio_id: number;

  @ManyToOne(() => Servicios, { eager: true })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ type: 'int' })
  motivo_id: number;

  @ManyToOne(() => MotivoCita, { eager: true })
  @JoinColumn({ name: 'motivo_id' })
  motivo: MotivoCita;

  @Column({ type: 'int' })
  estado_id: number;

  @ManyToOne(() => EstadoCita, { eager: true })
  @JoinColumn({ name: 'estado_id' })
  estado: EstadoCita;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'time', nullable: true })
  hora_fin: string;

  @Column({ type: 'int' })
  duracion_minutos: number;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ type: 'tinyint', default: 0 })
  firma_documento: number;

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