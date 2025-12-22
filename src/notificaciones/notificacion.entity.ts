import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Paciente } from '../pacientes/paciente.entity';

// DEPRECATED: Este enum ya no se usa, se maneja desde configuracion_notificaciones
// Se deja solo como referencia de tipos comunes
export enum TipoNotificacion {
  CUMPLEANOS_PACIENTE = 'CUMPLEANOS_PACIENTE',
  ANIVERSARIO_EMPLEADO = 'ANIVERSARIO_EMPLEADO',
  LOGIN_FUERA_HORARIO = 'LOGIN_FUERA_HORARIO',
  CITA_ELIMINADA = 'CITA_ELIMINADA',
}

@Entity('notificaciones')
@Index('idx_usuario_leida', ['usuarioId', 'leida'])
@Index('idx_tipo', ['tipo'])
@Index('idx_fecha', ['fechaCreacion'])
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  tipo: string;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ name: 'paciente_id', nullable: true })
  pacienteId: number;

  @Column({ name: 'empleado_id', nullable: true })
  empleadoId: number;

  @Column({ name: 'cita_id', nullable: true })
  citaId: number;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @Column({ name: 'fecha_leida', type: 'datetime', nullable: true })
  fechaLeida: Date;

  @Column({ name: 'datos_adicionales', type: 'json', nullable: true })
  datosAdicionales: any;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'datetime' })
  fechaCreacion: Date;

  @ManyToOne(() => TrabajadorCentro, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'empleado_id' })
  empleado: TrabajadorCentro;
}
