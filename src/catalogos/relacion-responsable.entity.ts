import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class RelacionResponsable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}