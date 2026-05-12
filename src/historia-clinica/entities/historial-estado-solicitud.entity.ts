import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { SolicitudInforme } from './solicitud-informe.entity';
import { EstadoSolicitudInforme } from './estado-solicitud-informe.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('historial_estado_solicitud')
export class HistorialEstadoSolicitud {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'solicitud_informe_id', unsigned: true })
  solicitud_informe_id: number;

  @ManyToOne(() => SolicitudInforme, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_informe_id' })
  solicitud_informe: SolicitudInforme;

  @Column({ name: 'estado_anterior_id', type: 'tinyint', unsigned: true, nullable: true })
  estado_anterior_id: number | null;

  @ManyToOne(() => EstadoSolicitudInforme, { eager: true, nullable: true })
  @JoinColumn({ name: 'estado_anterior_id' })
  estado_anterior: EstadoSolicitudInforme;

  @Column({ name: 'estado_nuevo_id', type: 'tinyint', unsigned: true })
  estado_nuevo_id: number;

  @ManyToOne(() => EstadoSolicitudInforme, { eager: true })
  @JoinColumn({ name: 'estado_nuevo_id' })
  estado_nuevo: EstadoSolicitudInforme;

  @Column({ name: 'user_id', type: 'int', unsigned: true, nullable: true })
  user_id: number | null;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: TrabajadorCentro;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @CreateDateColumn()
  created_at: Date;
}
