import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Cita } from './cita.entity';
import { EstadoCita } from '../../catalogos/estado-cita.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('seguimiento_asistencia')
export class SeguimientoAsistencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cita_id: number;

  // Registro de RECEPCIÓN
  @Column({ type: 'tinyint', default: 0 })
  recepcion_marco: number;

  @Column({ nullable: true })
  recepcion_usuario_id: number;

  @Column({ nullable: true })
  recepcion_estado_id: number;

  @Column({ type: 'timestamp', nullable: true })
  recepcion_fecha: Date;

  // Registro de TERAPEUTA
  @Column({ type: 'tinyint', default: 0 })
  terapeuta_marco: number;

  @Column({ nullable: true })
  terapeuta_usuario_id: number;

  @Column({ nullable: true })
  terapeuta_estado_id: number;

  @Column({ type: 'timestamp', nullable: true })
  terapeuta_fecha: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relaciones
  @ManyToOne(() => Cita, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;

  @ManyToOne(() => EstadoCita)
  @JoinColumn({ name: 'recepcion_estado_id' })
  recepcionEstado: EstadoCita;

  @ManyToOne(() => EstadoCita)
  @JoinColumn({ name: 'terapeuta_estado_id' })
  terapeutaEstado: EstadoCita;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'recepcion_usuario_id' })
  recepcionUsuario: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'terapeuta_usuario_id' })
  terapeutaUsuario: TrabajadorCentro;
}
