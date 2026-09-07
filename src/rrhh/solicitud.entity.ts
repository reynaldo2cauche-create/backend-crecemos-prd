import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { SolicitudHistorial } from './solicitud-historial.entity';

/**
 * Solicitud de permiso o vacaciones (autoservicio del terapeuta + aprobación RRHH).
 * El descuento de sueldo NO es automático: aprobar solo cambia el estado. Si toca
 * descontar, RRHH registra la falta aparte en la tabla `faltas`.
 */
@Entity('solicitud')
export class Solicitud {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  // permiso_personal | permiso_medico | permiso_capacitacion | permiso_horas | vacaciones | otro
  @Column({ type: 'varchar', length: 40 })
  tipo: string;

  @Column({ type: 'date' })
  fecha_inicio: string;

  @Column({ type: 'date', nullable: true })
  fecha_fin: string | null;

  @Column({ type: 'time', nullable: true })
  hora_desde: string | null;

  @Column({ type: 'time', nullable: true })
  hora_hasta: string | null;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  archivo_url: string | null;

  // pendiente | aprobado | rechazado
  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: string;

  @Column({ type: 'int', nullable: true })
  anticipacion_dias: number | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha_solicitud: Date;

  @Column({ type: 'text', nullable: true })
  comentario_colaborador: string | null;

  @Column({ type: 'text', nullable: true })
  comentario_rrhh: string | null;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'revisor_id' })
  revisor: TrabajadorCentro | null;

  @Column({ type: 'datetime', nullable: true })
  fecha_revision: Date | null;

  @OneToMany(() => SolicitudHistorial, (h) => h.solicitud)
  historial: SolicitudHistorial[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
