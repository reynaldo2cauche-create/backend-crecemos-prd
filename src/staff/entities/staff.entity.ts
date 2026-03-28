import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('staff_centro')
export class Staff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'trabajador_id' })
  trabajador_id: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  @Column({ type: 'text', nullable: true })
  descripcion_especialidad: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  foto: string;

  @Column({ type: 'int', default: 1 })
  orden: number;

  @Column({ name: 'flg_activo', type: 'tinyint', default: 1 })
  activo: boolean;

  @Column({ name: 'user_id_crea', nullable: true })
  user_id_crea: number;

  @Column({ name: 'user_id_actua', nullable: true })
  user_id_actua: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
