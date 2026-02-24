import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TipoDocumento } from '../../catalogos/tipo-documento.entity';
import { ResponsablePaciente } from './responsable-paciente.entity';

@Entity('responsable')
export class Responsable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombres: string;

  @Column({ length: 100 })
  apellido_paterno: string;

  @Column({ length: 100, nullable: true })
  apellido_materno: string;

  @ManyToOne(() => TipoDocumento, { nullable: true })
  @JoinColumn({ name: 'tipo_documento_id' })
  tipo_documento: TipoDocumento;

  @Column({ nullable: true })
  tipo_documento_id: number;

  @Column({ length: 20, nullable: true })
  numero_documento: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ type: 'tinyint', default: 1 })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updated_at: Date;

  // Relación con pacientes (muchos a muchos)
  @OneToMany(() => ResponsablePaciente, (rp) => rp.responsable)
  pacientes: ResponsablePaciente[];
}
