import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cita } from './cita.entity';

@Entity('visita_escolar')
export class VisitaEscolar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  id_cita: number;

  @ManyToOne(() => Cita)
  @JoinColumn({ name: 'id_cita' })
  cita: Cita;

  @Column({ type: 'varchar', length: 255 })
  nombre_colegio: string;

  @Column({ type: 'varchar', length: 255 })
  nombre_intermediario: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'int', nullable: true })
  user_id_crea: number;

  @Column({ type: 'int', nullable: true })
  user_id_actua: number;

  @Column({ type: 'timestamp', nullable: true })
  fecha_actua: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
