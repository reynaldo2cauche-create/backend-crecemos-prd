import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from './trabajador-centro.entity';
import { NivelEducacion } from '../catalogos/nivel-educacion.entity';

@Entity('datos_academicos')
export class DatosAcademicos {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrabajadorCentro, trabajador => trabajador.datos_academicos)
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  @ManyToOne(() => NivelEducacion, { eager: true })
  @JoinColumn({ name: 'nivel_educacion_id' })
  nivel_educacion: NivelEducacion;

  @Column({ type: 'varchar', length: 200, nullable: true })
  centro_estudios: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  carrera: string;

  @Column({ type: 'date', nullable: true })
  fecha_inicio: Date;

  @Column({ type: 'date', nullable: true })
  fecha_fin: Date;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
