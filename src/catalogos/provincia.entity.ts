import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Distrito } from './distrito.entity';

@Entity('provincias')
export class Provincia {
  @PrimaryColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 50 })
  region: string;

  @OneToMany(() => Distrito, distrito => distrito.provincia)
  distritos: Distrito[];
}
