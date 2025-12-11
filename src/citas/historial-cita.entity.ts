import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Cita } from './cita.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { MotivoCita } from '../catalogos/motivo-cita.entity';
import { EstadoCita } from '../catalogos/estado-cita.entity';
import { TipoCita } from '../catalogos/tipo-cita.entity';
import { HistorialCitaTerapeuta } from './historial-cita-terapeuta.entity';
import { HistorialCitaServicio } from './historial-cita-servicio.entity';

@Entity('historial_citas')
export class HistorialCita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cita_id: number;

  @ManyToOne(() => Cita)
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;

  @Column({ type: 'int' })
  tipo_cita_id: number;

  @ManyToOne(() => TipoCita, { eager: true })
  @JoinColumn({ name: 'tipo_cita_id' })
  tipo_cita: TipoCita;

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

  @ManyToOne(() => MotivoCita, { eager: true })
  @JoinColumn({ name: 'motivo_id' })
  motivo: MotivoCita;

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

  // RELACIONES CON TERAPEUTAS Y SERVICIOS
  @OneToMany(() => HistorialCitaTerapeuta, terapeuta => terapeuta.historial)
  terapeutas: HistorialCitaTerapeuta[];

  @OneToMany(() => HistorialCitaServicio, servicio => servicio.historial)
  servicios: HistorialCitaServicio[];

  @Column({ 
    type: 'enum', 
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    comment: 'Tipo de operación realizada'
  })
  tipo_operacion: string;

  @Column({ type: 'int', nullable: true })
  usuario_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_registro: Date;

  @Column({ type: 'text', nullable: true })
  descripcion_cambios: string;
}