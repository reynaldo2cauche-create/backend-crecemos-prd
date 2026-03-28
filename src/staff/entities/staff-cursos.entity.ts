import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Staff } from './staff.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('staff_centro_cursos')
export class StaffCursos {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'staff_id' })
  staff_id: number;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'int', default: 1 })
  orden: number;

  @Column({ name: 'flg_activo', type: 'tinyint', default: 1 })
  activo: boolean;

  @Column({ name: 'user_id_crea', nullable: true })
  user_id_crea: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_crea' })
  usuario_crea: TrabajadorCentro;

  @Column({ name: 'user_id_actua', nullable: true })
  user_id_actua: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_actua' })
  usuario_actua: TrabajadorCentro;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
