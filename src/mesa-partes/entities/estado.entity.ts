import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('mesa_partes_estado')
export class MesaPartesEstado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo: number;
}
