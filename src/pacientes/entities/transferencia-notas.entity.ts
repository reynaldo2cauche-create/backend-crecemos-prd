import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from '../paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('transferencia_notas')
export class TransferenciaNotas {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'user_id_crea_retiro' })
  terapeutaRetiro: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'user_id_asignado_nuevo' })
  terapeutaNuevo: TrabajadorCentro;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha_transferencia: Date;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo: boolean;
}
