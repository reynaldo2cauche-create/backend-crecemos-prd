import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { MesaPartesSolicitud } from './solicitud.entity';
import { MesaPartesTipoEvento } from './tipo-evento.entity';
import { MesaPartesEstado } from './estado.entity';

@Entity('mesa_partes_evento')
export class MesaPartesEvento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  solicitud_id: number;

  @ManyToOne(() => MesaPartesSolicitud, (sol) => sol.eventos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: MesaPartesSolicitud;

  @Column({ type: 'int' })
  tipo_evento_id: number;

  @ManyToOne(() => MesaPartesTipoEvento, { eager: true })
  @JoinColumn({ name: 'tipo_evento_id' })
  tipoEvento: MesaPartesTipoEvento;

  @Column({ type: 'int', nullable: true })
  estado_anterior_id: number;

  @ManyToOne(() => MesaPartesEstado, { eager: true })
  @JoinColumn({ name: 'estado_anterior_id' })
  estadoAnterior: MesaPartesEstado;

  @Column({ type: 'int', nullable: true })
  estado_nuevo_id: number;

  @ManyToOne(() => MesaPartesEstado, { eager: true })
  @JoinColumn({ name: 'estado_nuevo_id' })
  estadoNuevo: MesaPartesEstado;

  @Column({ type: 'text', nullable: true })
  comentario: string;

  // Auditoría estándar — user_crea_id = quién hizo la acción
  @Column({ type: 'int' })
  user_crea_id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_crea_id' })
  usuarioCrea: TrabajadorCentro;

  @Column({ type: 'int', nullable: true })
  user_actua_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
