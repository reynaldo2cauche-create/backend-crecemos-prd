import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { Servicios } from '../../catalogos/servicios.entity';

@Entity('reportes_evolucion')
export class ReporteEvolucion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paciente_id' })
  pacienteId: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ name: 'servicio_id', nullable: true })
  servicioId: number;

  @Column({ type: 'int', nullable: true })
  edad: number;

  @Column({ name: 'fecha_evaluacion', type: 'date', nullable: true })
  fechaEvaluacion: Date;

  @Column({ name: 'periodo_intervencion', length: 100, nullable: true })
  periodoIntervencion: string;

  @Column({ name: 'frecuencia_atencion', length: 100, nullable: true })
  frecuenciaAtencion: string;

  @Column({ length: 200, nullable: true })
  especialista: string;

  @Column({ type: 'text', nullable: true })
  metodologia: string;

  @Column({ type: 'text', nullable: true })
  objetivos: string;

  @Column({ type: 'text', nullable: true })
  logros: string;

  @Column({ type: 'text', nullable: true })
  dificultades: string;

  @Column({ name: 'objetivos_siguiente_periodo', type: 'text', nullable: true })
  objetivosSiguientePeriodo: string;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actua' })
  fechaActua: Date;

  @Column({ name: 'user_id_actua', nullable: true })
  userIdActua: number;

  @Column({ default: true })
  activo: boolean;

  // Relaciones
  @ManyToOne(() => Paciente, paciente => paciente.reportesEvolucion)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;

  @ManyToOne(() => Servicios)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;
}
