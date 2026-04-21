import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Sexo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}