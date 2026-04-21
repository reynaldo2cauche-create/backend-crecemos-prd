import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Servicios } from '../../catalogos/servicios.entity';
import { VentaServicio } from '../../ventas/entities/venta-servicio.entity';
import { TipoArchivo } from './tipo-archivo.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { ModalidadPago } from './modalidad-pago.entity';
import { EstadoPago } from './estado-pago.entity';
import { EstadoSolicitudInforme } from './estado-solicitud-informe.entity';
import { DocumentoTarifa } from 'src/inventario/entities/documento-tarifa.entity';

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

  @Column({ name: 'documento_tarifa_id' })
  documento_tarifa_id: number;

  @ManyToOne(() => DocumentoTarifa, { eager: true })
  @JoinColumn({ name: 'documento_tarifa_id' })
  documento_tarifa: DocumentoTarifa;

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
    comment: 'Pendiente, Pagado, Anulado',
  })
  estado_pago_id: number;

  @ManyToOne(() => EstadoPago, { eager: true })
  @JoinColumn({ name: 'estado_pago_id' })
  estado_pago: EstadoPago;

  @Column({ type: 'text', nullable: true })
  nota: string;

  // ──────────────────────────────────────────────────────────────────────────
  // CAMPOS WORKFLOW
  // ──────────────────────────────────────────────────────────────────────────

  @Column({
    name: 'archivo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Ruta/URL del archivo subido por la terapeuta',
  })
  archivo_url: string;

  @Column({
    name: 'estado_solicitud_id',
    type: 'tinyint',
    unsigned: true,
    default: 1,
    comment: 'FK a estado_solicitud_informe',
  })
  estado_solicitud_id: number;

  @ManyToOne(() => EstadoSolicitudInforme)
  @JoinColumn({ name: 'estado_solicitud_id' })
  estado_solicitud: EstadoSolicitudInforme;

  @Column({
    name: 'fecha_subida_archivo',
    type: 'timestamp',
    nullable: true,
    comment: 'Fecha cuando la terapeuta subió el archivo',
  })
  fecha_subida_archivo: Date;

  @Column({
    name: 'fecha_revision',
    type: 'timestamp',
    nullable: true,
    comment: 'Fecha de última revisión por la jefa',
  })
  fecha_revision: Date;

  @Column({
    name: 'revisor_id',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: 'FK a trabajador_centro (jefa que realizó la última revisión)',
  })
  revisor_id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'revisor_id' })
  revisor: TrabajadorCentro;

  // ──────────────────────────────────────────────────────────────────────────

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}