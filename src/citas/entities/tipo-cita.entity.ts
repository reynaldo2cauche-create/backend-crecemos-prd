import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipos_cita')
export class TipoCita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  requiere_terapeuta: boolean;

  @Column({ type: 'boolean', default: false })
  permite_multiples_terapeutas: boolean;

  @Column({ type: 'boolean', default: false })
  permite_multiples_servicios: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
