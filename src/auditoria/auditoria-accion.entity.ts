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
@Index('idx_trabajador_fecha', ['trabajadorId', 'fechaHora'])
export class AuditoriaAccion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'trabajador_id' })
  trabajadorId: number;

  @Column({ length: 100 })
  accion: string;

  @Column({ length: 50 })
  modulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'datos_nuevos', type: 'json', nullable: true })
  datosNuevos: any;

  @Column({ name: 'ip_address', length: 50, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  // =====================================================
  // 📍 GEOLOCALIZACIÓN
  // =====================================================

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 8, 
    nullable: true 
  })
  latitud: number;

  @Column({ 
    type: 'decimal', 
    precision: 11, 
    scale: 8, 
    nullable: true 
  })
  longitud: number;

  // =====================================================

  @CreateDateColumn({ name: 'fecha_hora', type: 'timestamp' })
  fechaHora: Date;

  @ManyToOne(() => TrabajadorCentro, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;
}