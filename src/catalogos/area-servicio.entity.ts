import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class AreaServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}