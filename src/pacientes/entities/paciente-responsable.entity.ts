import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from '../paciente.entity';
import { TipoDocumento } from '../../catalogos/tipo-documento.entity';
import { RelacionResponsable } from '../../catalogos/relacion-responsable.entity';
import { ProcesoLegalInfantil } from '../../procesos-legales-infantiles/entities/proceso-legal-infantil.entity';

@Entity('paciente_responsable')
export class PacienteResponsable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, (paciente) => paciente.responsables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column()
  paciente_id: number;

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

  @ManyToOne(() => RelacionResponsable, { nullable: true })
  @JoinColumn({ name: 'responsable_relacion_id' })
  responsable_relacion: RelacionResponsable;

  @Column({ nullable: true })
  responsable_relacion_id: number;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ type: 'tinyint', default: 0 })
  tiene_proceso_legal: boolean;

  @ManyToOne(() => ProcesoLegalInfantil, (proceso) => proceso.responsables, { nullable: true })
  @JoinColumn({ name: 'proceso_legal_infantil_id' })
  procesoLegalInfantil: ProcesoLegalInfantil;

  @Column({ nullable: true })
  proceso_legal_infantil_id: number;

  @Column({ type: 'tinyint', comment: '1 = principal, 2 = secundario, 3 = terciario' })
  orden: number;

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
}
