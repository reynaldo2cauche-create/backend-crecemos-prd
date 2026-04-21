import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from '../paciente.entity';
import { TipoDocumento } from '../../catalogos/tipo-documento.entity';

@Entity('pareja_paciente')
export class ParejaPaciente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column()
  nombres: string;

  @Column()
  apellido_paterno: string;

  @Column()
  apellido_materno: string;

  @ManyToOne(() => TipoDocumento)
  @JoinColumn({ name: 'tipo_documento_id' })
  tipo_documento: TipoDocumento;

  @Column()
  numero_documento: string;

  @Column()
  celular: string;

  @Column()
  direccion: string;

  @Column()
  email: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
} 