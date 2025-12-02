import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SeveridadAlerta } from './alerta-sistema.entity';

@Entity('configuracion_alertas')
@Index('idx_activa', ['activa'])
@Index('idx_tipo', ['tipoAlerta'])
export class ConfiguracionAlerta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ name: 'tipo_alerta', length: 50 })
  tipoAlerta: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  // Condiciones de la regla
  @Column({ name: 'condicion_tipo', length: 50 })
  condicionTipo: string;

  @Column({ name: 'condicion_valor', type: 'json' })
  condicionValor: any;

  // Estado de la regla
  @Column({ default: true })
  activa: boolean;

  @Column({
    type: 'enum',
    enum: SeveridadAlerta,
    default: SeveridadAlerta.MEDIA,
  })
  severidad: SeveridadAlerta;

  // Auditoría
  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp', nullable: true })
  fechaActualizacion: Date;
}
