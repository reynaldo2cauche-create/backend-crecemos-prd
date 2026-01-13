import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Provincia } from './provincia.entity';

@Entity('distritos')
export class Distrito {
  @PrimaryColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Provincia, provincia => provincia.distritos)
  @JoinColumn({ name: 'id_provincia' })
  provincia: Provincia;

  @Column()
  id_provincia: number;
}
