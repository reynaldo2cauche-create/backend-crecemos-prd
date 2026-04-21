import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { AuditoriaAccion } from './auditoria-accion.entity';

export enum SeveridadAlerta {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

@Entity('alertas_sistema')
@Index('idx_tipo', ['tipo'])
@Index('idx_severidad', ['severidad'])
@Index('idx_trabajador', ['trabajadorId'])
@Index('idx_leida', ['leida'])
@Index('idx_resuelta', ['resuelta'])
@Index('idx_fecha', ['fechaCreacion'])
@Index('idx_no_leidas', ['leida', 'severidad', 'fechaCreacion'])
export class AlertaSistema {
  @PrimaryGeneratedColumn()
  id: number;

  // Tipo y severidad
  @Column({ length: 50 })
  tipo: string;

  @Column({
    type: 'enum',
    enum: SeveridadAlerta,
    default: SeveridadAlerta.MEDIA,
  })
  severidad: SeveridadAlerta;

  // Usuario relacionado
  @Column({ name: 'trabajador_id', nullable: true })
  trabajadorId: number;

  @Column({ name: 'trabajador_nombre', length: 255, nullable: true })
  trabajadorNombre: string;

  // Detalles de la alerta
  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'json', nullable: true })
  contexto: any;

  // Auditoría relacionada
  @Column({ name: 'auditoria_id', nullable: true })
  auditoriaId: number;

  // Estado de la alerta
  @Column({ default: false })
  leida: boolean;

  @Column({ default: false })
  resuelta: boolean;

  @Column({ name: 'fecha_leida', type: 'timestamp', nullable: true })
  fechaLeida: Date;

  @Column({ name: 'fecha_resuelta', type: 'timestamp', nullable: true })
  fechaResuelta: Date;

  @Column({ name: 'resuelto_por', nullable: true })
  resueltoPor: number;

  @Column({ name: 'comentarios_resolucion', type: 'text', nullable: true })
  comentariosResolucion: string;

  // Auditoría temporal
  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;

  // Relaciones
  @ManyToOne(() => TrabajadorCentro, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  @ManyToOne(() => AuditoriaAccion, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: AuditoriaAccion;

  @ManyToOne(() => TrabajadorCentro, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resuelto_por' })
  resolvidoPor: TrabajadorCentro;
}
