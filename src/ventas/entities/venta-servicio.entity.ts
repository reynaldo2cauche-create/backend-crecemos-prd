import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TipoPagador } from './tipo-pagador.entity';
import { TipoDescuento } from './tipo-descuento.entity';
import { CompradorExterno } from './comprador-externo.entity';
import { Paciente } from '../../pacientes/paciente.entity';
import { PacienteResponsable } from '../../pacientes/entities/paciente-responsable.entity';
import { VentaServicioDetalle } from './venta-servicio-detalle.entity';
import { TipoComprobante } from './tipo-comprobante.entity';
import { Responsable } from 'src/pacientes/entities/responsable.entity';
// ✅ FIX: importar la entidad de promociones aplicadas
import { VentaPromocionAplicada } from '../../promociones/entities/venta-promocion-aplicada.entity';
import { ModalidadPago } from '../../historia-clinica/entities/modalidad-pago.entity';

@Entity('venta_servicio')
export class VentaServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, nullable: true, unique: true, comment: 'Código del comprobante (NV-0001, B001-00001, F001-00001)' })
  codigo_comprobante: string;

  @Column({ name: 'tipo_pagador_id', comment: '1=Paciente, 2=Responsable, 3=Externo' })
  tipo_pagador_id: number;

  @ManyToOne(() => TipoPagador)
  @JoinColumn({ name: 'tipo_pagador_id' })
  tipo_pagador: TipoPagador;

  @Column({ name: 'paciente_id', nullable: true, comment: 'Rellenar si tipo_pagador_id = 1' })
  paciente_id: number;

  @ManyToOne(() => Paciente, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ name: 'responsable_id', nullable: true, comment: 'Rellenar si tipo_pagador_id = 2' })
  responsable_id: number;

  @ManyToOne(() => Responsable, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Responsable;

  @Column({ name: 'comprador_externo_id', nullable: true, comment: 'Rellenar si tipo_pagador_id = 3' })
  comprador_externo_id: number;

  @ManyToOne(() => CompradorExterno, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'comprador_externo_id' })
  comprador_externo: CompradorExterno;

  @Column({ type: 'date' })
  fecha_venta: string;

  @Column({ name: 'tipo_comprobante_id', comment: '1=Nota de Venta, 2=Boleta, 3=Factura' })
  tipo_comprobante_id: number;

  @ManyToOne(() => TipoComprobante)
  @JoinColumn({ name: 'tipo_comprobante_id' })
  tipo_comprobante: TipoComprobante;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Suma de subtotales del detalle' })
  subtotal: number;

  @Column({ name: 'descuento_tipo_id', nullable: true, comment: 'Descuento global: 1=Porcentaje, 2=Monto fijo' })
  descuento_tipo_id: number;

  @ManyToOne(() => TipoDescuento, { nullable: true })
  @JoinColumn({ name: 'descuento_tipo_id' })
  descuento_tipo: TipoDescuento;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, comment: 'Valor ingresado del descuento global' })
  descuento_valor: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, comment: 'Monto calculado del descuento global' })
  descuento_monto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, comment: 'Descuento por promociones automáticas' })
  descuento_promocion: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'subtotal - descuento_monto' })
  total: number;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ name: 'modalidad_pago_id', nullable: true, comment: 'Método de pago utilizado' })
  modalidad_pago_id: number;

  @ManyToOne(() => ModalidadPago, { nullable: true })
  @JoinColumn({ name: 'modalidad_pago_id' })
  modalidad_pago: ModalidadPago;

  @Column({ nullable: true })
  user_crea_id: number;

  @Column({ nullable: true })
  user_actua_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => VentaServicioDetalle, (d) => d.venta, { cascade: true })
  detalles: VentaServicioDetalle[];

  // ✅ FIX: propiedad virtual para recibir las promociones aplicadas cargadas desde el service
  promociones_aplicadas?: VentaPromocionAplicada[];
}