import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('estado_cita')
export class EstadoCita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
