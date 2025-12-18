import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AreaServicio } from './area-servicio.entity';
import { Especialidad } from '../usuarios/especialidad.entity';

@Entity()
export class Servicios {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AreaServicio)
  @JoinColumn({ name: 'area_id' })
  area: AreaServicio;

  @ManyToOne(() => Especialidad, { nullable: true })
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;

  @Column()
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}
