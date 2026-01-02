// src/convenios/entities/beneficio.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Convenio } from './convenio.entity';
import { CategoriaBeneficio } from './categoria-beneficio.entity';

@Entity('beneficios')
export class Beneficio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  descuento: string;

  @Column({ nullable: true })
  convenio_id: number;

  @Column({ nullable: true })
  categoria_id: number;

  @Column({ name: 'flg_activo', type: 'tinyint', width: 1, default: 1 })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updated_at: Date;

  @Column({ nullable: true })
  user_id_crea: number;

  @Column({ nullable: true })
  user_id_actua: number;

  // Relación directa con Convenio
  @ManyToOne(() => Convenio)
  @JoinColumn({ name: 'convenio_id' })
  convenio: Convenio;

  // Relación con CategoriaBeneficio
  @ManyToOne(() => CategoriaBeneficio, categoria => categoria.beneficios, { eager: true })
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaBeneficio;
}
