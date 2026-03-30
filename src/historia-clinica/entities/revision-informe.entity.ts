import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SolicitudInforme } from './solicitud-informe.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { EstadoSolicitudInforme } from './estado-solicitud-informe.entity';

@Entity('revision_informe')
export class RevisionInforme {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'solicitud_informe_id', unsigned: true })
  solicitud_informe_id: number;

  @ManyToOne(() => SolicitudInforme, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_informe_id' })
  solicitud_informe: SolicitudInforme;

  @Column({ name: 'revisor_id', unsigned: true })
  revisor_id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'revisor_id' })
  revisor: TrabajadorCentro;

  @Column({ name: 'estado_id', type: 'tinyint', unsigned: true })
  estado_id: number;

  @ManyToOne(() => EstadoSolicitudInforme, { eager: true })
  @JoinColumn({ name: 'estado_id' })
  estado: EstadoSolicitudInforme;

  @Column({ type: 'text', nullable: true, comment: 'Comentarios (obligatorio si rechazado)' })
  comentario: string;

  @Column({ name: 'fecha_revision', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_revision: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}