// src/convenios/entities/beneficio-termino.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Beneficio } from './beneficio.entity';

@Entity('beneficios_terminos')
export class BeneficioTermino {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  beneficio_id: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ name: 'flg_activo', type: 'tinyint', width: 1, default: 1 })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  // Relación con Beneficio
  @ManyToOne(() => Beneficio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficio_id' })
  beneficio: Beneficio;
}
