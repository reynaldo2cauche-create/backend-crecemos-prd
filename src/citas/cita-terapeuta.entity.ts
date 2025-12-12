import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Cita } from './cita.entity';

@Entity('cita_terapeutas')
export class CitaTerapeuta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cita_id: number;

  @Column({ type: 'int' })
  terapeuta_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  rol_en_cita: string;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number;

  @Column({ type: 'int', nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => Cita, cita => cita.terapeutas)
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;
}