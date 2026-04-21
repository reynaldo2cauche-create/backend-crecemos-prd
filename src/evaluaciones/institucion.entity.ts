// src/evaluaciones/entities/institucion.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { DatosEstudiante } from './datos-estudiante.entity';

@Entity('instituciones')
export class Institucion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column()
  direccion: string;

  @Column()
  telefono: string;

  @OneToMany(() => DatosEstudiante, datosEstudiante => datosEstudiante.institucion)
  datos_estudiantes: DatosEstudiante[];
}