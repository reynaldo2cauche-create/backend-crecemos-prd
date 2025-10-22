// =====================================================
// src/entities/cargo-postulacion.entity.ts
// =====================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Postulacion } from './postulacion.entity';

@Entity('cargo_postulacion')
export class CargoPostulacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  descripcion: string;

  @Column({ type: 'tinyint', default: 1 })
  activo: number;

  // ✅ CORRECCIÓN: Apunta a la relación real, no al campo virtual
  @OneToMany(() => Postulacion, (postulacion) => postulacion.cargoPostulacionRelacion)
  postulaciones: Postulacion[];
}