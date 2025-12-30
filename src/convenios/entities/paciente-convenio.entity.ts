// src/convenios/entities/paciente-convenio.entity.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { Convenio } from './convenio.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('paciente_convenio')
export class PacienteConvenio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  paciente_id: number;

  @Column()
  convenio_id: number;

  @Column({ type: 'date', nullable: true })
  fecha_inicio: Date;

  @Column({ type: 'date', nullable: true })
  fecha_fin: Date;

  @Column({ name: 'flg_activo', default: true })
  activo: boolean;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

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

  @ManyToOne(() => Paciente, paciente => paciente.id, { eager: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => Convenio, convenio => convenio.pacienteConvenios, { eager: true })
  @JoinColumn({ name: 'convenio_id' })
  convenio: Convenio;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_crea' })
  usuarioCreador: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_actua' })
  usuarioActualizador: TrabajadorCentro;
}