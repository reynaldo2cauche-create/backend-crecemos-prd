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

@Entity('auditoria_acciones')
@Index('idx_trabajador', ['trabajadorId'])
@Index('idx_fecha', ['fechaHora'])
@Index('idx_modulo', ['modulo'])
@Index('idx_accion', ['accion'])
@Index('idx_entidad', ['entidadTipo', 'entidadId'])
@Index('idx_trabajador_fecha', ['trabajadorId', 'fechaHora'])
@Index('idx_busqueda_completa', ['modulo', 'accion', 'fechaHora', 'trabajadorId'])
@Index('idx_actividad_reciente', ['trabajadorId', 'fechaHora', 'modulo'])
export class AuditoriaAccion {
  @PrimaryGeneratedColumn()
  id: number;

  // Usuario que realizó la acción
  @Column({ name: 'trabajador_id', nullable: true })
  trabajadorId: number;

  @Column({ name: 'trabajador_nombre', length: 255 })
  trabajadorNombre: string;

  @Column({ name: 'trabajador_username', length: 100 })
  trabajadorUsername: string;

  @Column({ name: 'trabajador_rol', length: 100, nullable: true })
  trabajadorRol: string;

  // Qué hizo
  @Column({ length: 100 })
  accion: string;

  @Column({ length: 50 })
  modulo: string;

  // Sobre qué entidad/recurso
  @Column({ name: 'entidad_tipo', length: 50, nullable: true })
  entidadTipo: string;

  @Column({ name: 'entidad_id', nullable: true })
  entidadId: number;

  @Column({ name: 'entidad_nombre', length: 255, nullable: true })
  entidadNombre: string;

  // Detalles de la acción
  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'datos_anteriores', type: 'json', nullable: true })
  datosAnteriores: any;

  @Column({ name: 'datos_nuevos', type: 'json', nullable: true })
  datosNuevos: any;

  // Metadatos técnicos
  @Column({ name: 'ip_address', length: 50, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'metodo_http', length: 10, nullable: true })
  metodoHttp: string;

  @Column({ length: 255, nullable: true })
  endpoint: string;

  @Column({ name: 'codigo_respuesta', nullable: true })
  codigoRespuesta: number;

  // Auditoría temporal
  @CreateDateColumn({ name: 'fecha_hora', type: 'timestamp' })
  fechaHora: Date;

  // Relación con trabajador (nullable para accesos anónimos)
  @ManyToOne(() => TrabajadorCentro, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;
}