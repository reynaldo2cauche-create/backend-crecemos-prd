import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TrabajadorCentro } from './trabajador-centro.entity';
import { Servicios } from '../catalogos/servicios.entity';

@Entity('trabajador_servicio')
export class TrabajadorServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  @ManyToOne(() => Servicios, { eager: true })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_asignacion: Date;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  // ✅ NUEVOS CAMPOS: Usuario que crea/actualiza la asignación
  @Column({ nullable: true, name: 'user_id_crea' })
  userIdCrea: number;

  @Column({ nullable: true, name: 'user_id_actua' })
  userIdActua: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
