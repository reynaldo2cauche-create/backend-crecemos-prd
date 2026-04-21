// src/evaluaciones/entities/seccion.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { DatosEstudiante } from './datos-estudiante.entity';

@Entity('secciones')
export class Seccion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string; // "A", "B", "C", etc.

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => DatosEstudiante, datosEstudiante => datosEstudiante.seccion)
  datos_estudiantes: DatosEstudiante[];
}