import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { Paciente } from '../../pacientes/paciente.entity';
import { MesaPartesTipo } from './tipo.entity';
import { MesaPartesEstado } from './estado.entity';
import { MesaPartesEvento } from './evento.entity';
import { MesaPartesAdjunto } from './adjunto.entity';

@Entity('mesa_partes_solicitud')
export class MesaPartesSolicitud {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  numero_expediente: string;

  @Column({ type: 'int', nullable: true })
  paciente_id: number;

  @ManyToOne(() => Paciente, { nullable: true, eager: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ type: 'int' })
  tipo_id: number;

  @ManyToOne(() => MesaPartesTipo, { eager: true })
  @JoinColumn({ name: 'tipo_id' })
  tipo: MesaPartesTipo;

  @Column({ type: 'varchar', length: 200, nullable: true })
  asunto: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar', length: 150 })
  entregado_por_nombre: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  entregado_por_doc: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  entregado_por_telefono: string;

  @Column({ type: 'int' })
  estado_id: number;

  @ManyToOne(() => MesaPartesEstado, { eager: true })
  @JoinColumn({ name: 'estado_id' })
  estado: MesaPartesEstado;

  @Column({ type: 'text', nullable: true })
  respuesta: string;

  @Column({ type: 'int', nullable: true })
  respondido_por: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'respondido_por' })
  responde: TrabajadorCentro;

  @Column({ type: 'datetime', nullable: true })
  fecha_respuesta: Date;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo: number;

  // Auditoría estándar
  @Column({ type: 'int' })
  user_crea_id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_crea_id' })
  usuarioCrea: TrabajadorCentro;

  @Column({ type: 'int', nullable: true })
  user_actua_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_actua_id' })
  usuarioActua: TrabajadorCentro;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => MesaPartesEvento, (ev) => ev.solicitud)
  eventos: MesaPartesEvento[];

  @OneToMany(() => MesaPartesAdjunto, (adj) => adj.solicitud)
  adjuntos: MesaPartesAdjunto[];
}
