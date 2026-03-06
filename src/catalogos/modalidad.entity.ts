import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('modalidad')
export class Modalidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}
