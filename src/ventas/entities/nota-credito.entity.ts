import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VentaServicio } from './venta-servicio.entity';
import { ModalidadPago } from '../../historia-clinica/entities/modalidad-pago.entity';
import { TrabajadorCentro } from '../../evaluaciones/trabajador-centro.entity';

@Entity('nota_credito')
export class NotaCredito {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, nullable: true, unique: true, comment: 'Código de la nota de crédito (NC-0001)' })
  codigo: string;

  @Column({ name: 'venta_servicio_id', comment: 'Venta de servicio a la que aplica la devolución' })
  venta_servicio_id: number;

  @ManyToOne(() => VentaServicio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_servicio_id' })
  venta: VentaServicio;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text', nullable: true, comment: 'Motivo de la devolución' })
  motivo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, comment: 'Monto reembolsado al cliente' })
  monto_devuelto: number;

  @Column({ name: 'modalidad_pago_id', nullable: true, comment: 'Método por el que se devuelve el dinero' })
  modalidad_pago_id: number;

  @ManyToOne(() => ModalidadPago, { nullable: true })
  @JoinColumn({ name: 'modalidad_pago_id' })
  modalidad_pago: ModalidadPago;

  @Column({ type: 'int', default: 0, comment: 'Cantidad de citas futuras anuladas (liberadas de la agenda)' })
  citas_anuladas: number;

  @Column({ type: 'int', default: 0, comment: 'Cantidad de sesiones sin asignar que se anularon' })
  sesiones_anuladas: number;

  @Column({ nullable: true })
  user_crea_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_crea_id' })
  user_crea: TrabajadorCentro;

  @Column({ name: 'validado', type: 'tinyint', width: 1, default: 0 })
  validado: boolean;

  @Column({ name: 'validado_por', type: 'int', nullable: true })
  validado_por: number | null;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: false })
  @JoinColumn({ name: 'validado_por' })
  validado_por_trabajador: TrabajadorCentro;

  @Column({ name: 'validado_at', type: 'timestamp', nullable: true })
  validado_at: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
