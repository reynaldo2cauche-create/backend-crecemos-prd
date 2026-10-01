import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('mesa_partes_tipo')
export class MesaPartesTipo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo: number;
}
