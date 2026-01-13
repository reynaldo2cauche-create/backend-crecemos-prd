import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('nivel_educacion')
export class NivelEducacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
