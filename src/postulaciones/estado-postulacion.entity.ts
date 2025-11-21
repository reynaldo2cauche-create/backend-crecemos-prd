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

  // ✅ CORRECCIÓN: Apunta a la relación real, no al campo virtual
  @OneToMany(() => Postulacion, (postulacion) => postulacion.estadoPostulacionRelacion)
  postulaciones: Postulacion[];
}