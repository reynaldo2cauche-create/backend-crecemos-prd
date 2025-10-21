// =====================================================
// src/entities/cargo-postulacion.entity.ts
// =====================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
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

  // Relación uno a muchos con postulaciones
  @OneToMany(() => Postulacion, (postulacion) => postulacion.cargo_postulado)
  postulaciones: Postulacion[];
}
