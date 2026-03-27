import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Servicios } from '../../catalogos/servicios.entity';
import { VentaServicio } from '../../ventas/entities/venta-servicio.entity';
import { TipoArchivo } from './tipo-archivo.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { ModalidadPago } from './modalidad-pago.entity';
import { EstadoPago } from './estado-pago.entity';

@Entity('solicitud_informe')
export class SolicitudInforme {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'servicio_id' })
  servicio_id: number;

  @ManyToOne(() => Servicios, { eager: true })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ name: 'venta_servicio_id' })
  venta_servicio_id: number;

  @ManyToOne(() => VentaServicio)
  @JoinColumn({ name: 'venta_servicio_id' })
  venta_servicio: VentaServicio;

  @Column({ name: 'tipo_archivo_id' })
  tipo_archivo_id: number;

  @ManyToOne(() => TipoArchivo, { eager: true })
  @JoinColumn({ name: 'tipo_archivo_id' })
  tipo_archivo: TipoArchivo;

  @Column({ name: 'especialista_id' })
  especialista_id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'especialista_id' })
  especialista: TrabajadorCentro;

  @Column({ type: 'date', comment: 'Fecha en que se solicita el informe' })
  fecha_solicitud: string;

  @Column({ type: 'date', nullable: true, comment: 'Se llena cuando la terapeuta sube el archivo' })
  fecha_entrega: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  monto: number;

  @Column({ type: 'varchar', length: 50 })
  nro_recibo: string;

  @Column({ name: 'modalidad_pago_id', type: 'tinyint', unsigned: true, nullable: true })
  modalidad_pago_id: number;

  @ManyToOne(() => ModalidadPago, { eager: true, nullable: true })
  @JoinColumn({ name: 'modalidad_pago_id' })
  modalidad_pago: ModalidadPago;

  @Column({
    name: 'estado_pago_id',
    type: 'tinyint',
    unsigned: true,
    default: 1,
    comment: 'Pendiente, Pagado, Anulado'
  })
  estado_pago_id: number;

  @ManyToOne(() => EstadoPago, { eager: true })
  @JoinColumn({ name: 'estado_pago_id' })
  estado_pago: EstadoPago;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
