import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('beneficios')
export class Beneficio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ length: 50, nullable: true })
  categoria: string;

  @Column({ length: 100, nullable: true })
  proveedor: string;

  @Column({ length: 50, nullable: true })
  descuento: string;

  @Column({ length: 10, nullable: true })
  icono: string;

  @Column({ length: 20, nullable: true })
  codigo_beneficio: string;

  @Column({ type: 'text', nullable: true })
  como_canjear: string;

  @Column({ type: 'date', nullable: true })
  fecha_vigencia: Date;

  @Column({ length: 50, nullable: true })
  etiqueta: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;
}