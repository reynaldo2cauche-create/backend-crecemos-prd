// src/evaluaciones/entities/grado.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { DatosEstudiante } from './datos-estudiante.entity';

@Entity('grados')
export class Grado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string; // "1er grado", "2do grado", etc.

  @Column()
  nivel: string; // "Primaria", "Secundaria"

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => DatosEstudiante, datosEstudiante => datosEstudiante.grado)
  datos_estudiantes: DatosEstudiante[];
}