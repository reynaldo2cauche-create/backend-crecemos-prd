import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('frecuencia')
export class Frecuencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}
