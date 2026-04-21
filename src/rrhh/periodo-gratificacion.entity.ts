import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('periodo_gratificacion')
export class PeriodoGratificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['JULIO', 'DICIEMBRE'] })
  mes_gratificacion: 'JULIO' | 'DICIEMBRE';

  @Column()
  anio: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
