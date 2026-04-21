import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Responsable } from './responsable.entity';
import { Paciente } from '../paciente.entity';
import { RelacionResponsable } from '../../catalogos/relacion-responsable.entity';
import { ProcesoLegalInfantil } from '../../procesos-legales-infantiles/entities/proceso-legal-infantil.entity';

@Entity('responsable_paciente')
export class ResponsablePaciente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Responsable, (responsable) => responsable.pacientes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Responsable;

  @Column()
  responsable_id: number;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column()
  paciente_id: number;

  @ManyToOne(() => RelacionResponsable, { nullable: true })
  @JoinColumn({ name: 'responsable_relacion_id' })
  responsable_relacion: RelacionResponsable;

  @Column({ nullable: true })
  responsable_relacion_id: number;

  @Column({ type: 'tinyint', default: 0 })
  tiene_proceso_legal: boolean;

  @ManyToOne(() => ProcesoLegalInfantil, { nullable: true })
  @JoinColumn({ name: 'proceso_legal_infantil_id' })
  proceso_legal_infantil: ProcesoLegalInfantil;

  @Column({ nullable: true })
  proceso_legal_infantil_id: number;

  @Column({ type: 'tinyint', comment: '1=principal, 2=secundario' })
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
