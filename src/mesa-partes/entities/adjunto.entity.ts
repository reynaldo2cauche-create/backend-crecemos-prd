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

@Entity('mesa_partes_adjunto')
export class MesaPartesAdjunto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  solicitud_id: number;

  @ManyToOne(() => MesaPartesSolicitud, (sol) => sol.adjuntos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: MesaPartesSolicitud;

  @Column({ type: 'int', nullable: true })
  evento_id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre_archivo: string;

  @Column({ type: 'varchar', length: 500 })
  ruta: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tipo_mime: string;

  @Column({ type: 'int', nullable: true })
  tamano: number;

  // Auditoría estándar — user_crea_id = quién subió el archivo
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
