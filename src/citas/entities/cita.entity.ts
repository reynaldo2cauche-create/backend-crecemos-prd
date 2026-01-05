import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { Servicios as Servicio } from '../../catalogos/servicios.entity';
import { MotivoCita } from '../../catalogos/motivo-cita.entity';
import { EstadoCita } from '../../catalogos/estado-cita.entity';

/**
 * Entidad para CITAS NORMALES
 * Solo para citas individuales estándar
 */
@Entity('citas')
export class Cita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  paciente_id: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ type: 'int', nullable: true })
  doctor_id: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'doctor_id' })
  doctor: TrabajadorCentro;

  @Column({ type: 'int', nullable: true })
  servicio_id: number;

  @ManyToOne(() => Servicio)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicio;

  @Column({ type: 'int' })
  motivo_id: number;

  @ManyToOne(() => MotivoCita)
  @JoinColumn({ name: 'motivo_id' })
  motivo: MotivoCita;

  @Column({ type: 'int' })
  estado_id: number;

  @ManyToOne(() => EstadoCita)
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

  @Column({ type: 'boolean', default: false })
  firma_documento: boolean;

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
