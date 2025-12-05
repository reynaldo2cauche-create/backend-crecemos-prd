import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('mes')
export class Mes {
  @PrimaryColumn()
  id: number; // 1-12

  @Column({ length: 20 })
  nombre: string; // Enero, Febrero, ...

  @Column({ length: 3 })
  nombre_corto: string; // ENE, FEB, ...

  @Column()
  numero: number; // 1-12

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
