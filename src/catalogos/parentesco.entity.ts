import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('parentesco')
export class Parentesco {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
