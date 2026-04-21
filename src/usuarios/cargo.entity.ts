import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TrabajadorCentro } from './trabajador-centro.entity';

@Entity('cargos')
export class Cargo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  nombre: string;

  @Column({ default: false })
  es_jefe: boolean;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  user_id_crea: number;

  @Column({ nullable: true })
  user_id_actua: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relaciones con usuario que crea/actualiza
  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_crea' })
  usuarioCrea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_actua' })
  usuarioActualiza: TrabajadorCentro;
}
