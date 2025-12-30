// src/convenios/entities/convenio.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { PacienteConvenio } from './paciente-convenio.entity';
import { Beneficio } from './beneficio.entity';

@Entity('convenios')
export class Convenio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre', length: 100 })
  empresa: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ length: 500, nullable: true })
  logo_url: string;

  @Column({ name: 'flg_activo', default: true })
  activo: boolean;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP' 
  })
  created_at: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP' 
  })
  updated_at: Date;

  @Column({ nullable: true })
  user_id_crea: number;

  @Column({ nullable: true })
  user_id_actua: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_crea' })
  usuarioCreador: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_actua' })
  usuarioActualizador: TrabajadorCentro;

  @OneToMany(() => PacienteConvenio, pacienteConvenio => pacienteConvenio.convenio)
  pacienteConvenios: PacienteConvenio[];

  @OneToMany(() => Beneficio, beneficio => beneficio.convenio)
  beneficios: Beneficio[];
}