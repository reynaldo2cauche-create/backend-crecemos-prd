import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('configuracion_notificaciones')
export class ConfiguracionNotificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  tipo: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'dias_anticipacion', type: 'int', default: 1 })
  diasAnticipacion: number;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'datetime' })
  fechaActualizacion: Date;
}
