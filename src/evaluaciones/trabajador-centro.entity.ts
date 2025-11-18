// src/evaluaciones/entities/trabajador-centro.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Institucion } from './institucion.entity';
import { DatosEstudiante } from './datos-estudiante.entity';


@Entity('trabajador_centro')
export class TrabajadorCentro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @Column({ unique: true })
  dni: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column()
  rol: string;

  @Column()
  cargo: string;

  @Column({ nullable: true })
  especialidad: string;

  @ManyToOne(() => Institucion, { eager: true })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion;

  @Column({ default: true })
  estado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_acceso: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => DatosEstudiante, datosEstudiante => datosEstudiante.evaluador)
  evaluaciones: DatosEstudiante[];
}