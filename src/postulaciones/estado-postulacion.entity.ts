// =====================================================
// src/entities/estado-postulacion.entity.ts
// =====================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,

  OneToMany,
} from 'typeorm';
import { Postulacion } from './postulacion.entity';

@Entity('estado_postulacion')
export class EstadoPostulacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  descripcion: string;

  @Column({ type: 'tinyint', default: 1 })
  activo: number;

  // Relación uno a muchos con postulaciones
  @OneToMany(() => Postulacion, (postulacion) => postulacion.estado_postulacion)
  postulaciones: Postulacion[];
}
