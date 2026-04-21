import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('libro_reclamaciones_tipo_solicitud')
export class LibroReclamacionesTipoSolicitud {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  nombre: string;
}
