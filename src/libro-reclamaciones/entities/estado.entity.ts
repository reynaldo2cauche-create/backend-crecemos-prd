import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('libro_reclamaciones_estado')
export class LibroReclamacionesEstado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;
}
