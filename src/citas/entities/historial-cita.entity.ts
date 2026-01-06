import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { Servicios } from '../../catalogos/servicios.entity';
import { MotivoCita } from '../../catalogos/motivo-cita.entity';
import { EstadoCita } from '../../catalogos/estado-cita.entity';
import { Cita } from './cita.entity';
import { HistorialCitaReunionTerapeutas } from './historial-cita-reunion-terapeutas.entity';
import { HistorialCitaReunionServicios } from './historial-cita-reunion-servicios.entity';
import { HistorialCitaVisitaEscolar } from './historial-cita-visita-escolar.entity';

@Entity('historial_citas')
export class HistorialCita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'cita_id' })
  cita_id: number;

  @ManyToOne(() => Cita)
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;

  @Column({ type: 'int', name: 'paciente_id' })
  paciente_id: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ type: 'int', name: 'doctor_id', nullable: true })
  doctor_id: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'doctor_id' })
  doctor: TrabajadorCentro;

  @Column({ type: 'int', name: 'servicio_id', nullable: true })
  servicio_id: number;

  @ManyToOne(() => Servicios)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ type: 'int', name: 'motivo_id' })
  motivo_id: number;

  @ManyToOne(() => MotivoCita)
  @JoinColumn({ name: 'motivo_id' })
  motivo: MotivoCita;

  @Column({ type: 'int', name: 'estado_id' })
  estado_id: number;

  @ManyToOne(() => EstadoCita)
  @JoinColumn({ name: 'estado_id' })
  estado: EstadoCita;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time', name: 'hora_inicio' })
  hora_inicio: string;

  @Column({ type: 'time', name: 'hora_fin', nullable: true })
  hora_fin: string;

  @Column({ type: 'int', name: 'duracion_minutos' })
  duracion_minutos: number;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ type: 'enum', enum: ['CREATE', 'UPDATE', 'DELETE'], name: 'tipo_operacion' })
  tipo_operacion: 'CREATE' | 'UPDATE' | 'DELETE';

  @Column({ type: 'int', name: 'usuario_id', nullable: true })
  usuario_id: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;

  @Column({ type: 'timestamp', name: 'fecha_registro', default: () => 'CURRENT_TIMESTAMP' })
  fecha_registro: Date;

  @Column({ type: 'text', name: 'descripcion_cambios', nullable: true })
  descripcion_cambios: string;

  // Relaciones con tablas auxiliares de historial
  @OneToMany(() => HistorialCitaReunionTerapeutas, t => t.historialCita, { cascade: true })
  terapeutas: HistorialCitaReunionTerapeutas[];

  @OneToMany(() => HistorialCitaReunionServicios, s => s.historialCita, { cascade: true })
  servicios: HistorialCitaReunionServicios[];

  @OneToMany(() => HistorialCitaVisitaEscolar, v => v.historialCita, { cascade: true })
  visitasEscolares: HistorialCitaVisitaEscolar[];
}
