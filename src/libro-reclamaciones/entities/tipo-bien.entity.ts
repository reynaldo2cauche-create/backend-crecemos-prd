import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('libro_reclamaciones_tipo_bien')
export class LibroReclamacionesTipoBien {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  nombre: string;
}
