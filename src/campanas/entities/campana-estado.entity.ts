import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('campana_estado')
export class CampanaEstado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 150, nullable: true })
  descripcion: string;
}
