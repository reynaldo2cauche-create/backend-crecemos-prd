import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

/**
 * Solicitud de reprogramación de cita.
 *
 * La 1ª reprogramación de un paciente sigue siendo libre para Admisión.
 * A partir de la 2ª, en vez de bloquearse, Admisión genera esta solicitud
 * con los cambios propuestos y el Administrador la aprueba/rechaza.
 * Al aprobar se aplica el cambio reusando CitasService.actualizar (como
 * Administrador, por eso no vuelve a saltar el límite por paciente).
 */
@Entity('solicitud_reprogramacion')
export class SolicitudReprogramacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cita_id: number;

  @Column({ type: 'int', nullable: true })
  paciente_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paciente_nombre: string | null;

  // Quién la genera (Admisión) — columna de auditoría estándar
  @Column({ type: 'int', nullable: true })
  user_crea_id: number | null;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_crea_id' })
  solicitante: TrabajadorCentro | null;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  // ── Snapshot del estado ACTUAL de la cita ──
  @Column({ type: 'date', nullable: true })
  fecha_anterior: string | null;

  @Column({ type: 'time', nullable: true })
  hora_inicio_anterior: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  doctor_nombre_anterior: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  servicio_nombre_anterior: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo_cita_anterior: string | null;

  // ── Cambios propuestos (display) ──
  @Column({ type: 'date', nullable: true })
  fecha_nueva: string | null;

  @Column({ type: 'time', nullable: true })
  hora_inicio_nueva: string | null;

  @Column({ type: 'time', nullable: true })
  hora_fin_nueva: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  doctor_nombre_nuevo: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  servicio_nombre_nuevo: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo_cita_nuevo: string | null;

  // Payload completo (CrearCitaDto) que se aplica al aprobar
  @Column({ type: 'longtext', nullable: true })
  payload_json: string | null;

  // pendiente | aprobada | rechazada
  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: string;

  // Quién la aprobó/rechazó (Admin) — columna de auditoría estándar
  @Column({ type: 'int', nullable: true })
  user_actua_id: number | null;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_actua_id' })
  revisor: TrabajadorCentro | null;

  @Column({ type: 'datetime', nullable: true })
  fecha_revision: Date | null;

  @Column({ type: 'text', nullable: true })
  comentario_revisor: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
