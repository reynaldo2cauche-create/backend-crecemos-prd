import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PacienteResponsable } from '../../pacientes/entities/paciente-responsable.entity';

@Entity('procesos_legales_infantiles')
export class ProcesoLegalInfantil {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'tinyint', default: 1 })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(
    () => PacienteResponsable,
    (responsable) => responsable.procesoLegalInfantil,
  )
  responsables: PacienteResponsable[];
}
