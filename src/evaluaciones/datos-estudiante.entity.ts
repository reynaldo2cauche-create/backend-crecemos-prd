// src/evaluaciones/entities/datos-estudiante.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Institucion } from './institucion.entity';
import { Grado } from './grado.entity';
import { Seccion } from './seccion.entity';

import { TrabajadorCentro } from './trabajador-centro.entity';

@Entity('datos_estudiantes')
export class DatosEstudiante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre_estudiante: string;

  @Column()
  apellidos_estudiante: string;

  @ManyToOne(() => Institucion, { eager: true })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion;

  @ManyToOne(() => Grado, { eager: true })
  @JoinColumn({ name: 'grado_id' })
  grado: Grado;

  @ManyToOne(() => Seccion, { eager: true })
  @JoinColumn({ name: 'seccion_id' })
  seccion: Seccion;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'evaluador_id' })
  evaluador: TrabajadorCentro;

  @Column()
  fecha: Date;

  @Column()
  tiempo_evaluacion: number;
  
}