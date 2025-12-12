import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cita } from './cita.entity';

@Entity('cita_encargados')
export class CitaEncargado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cita_id: number;

  @Column({ type: 'varchar', length: 200 })
  nombre_completo: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cargo: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  institucion: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number;

  @Column({ type: 'int', nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => Cita, cita => cita.encargados)
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;
}
