import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VentaServicio } from './venta-servicio.entity';
import { TipoVentaServicio } from './tipo-venta-servicio.entity';
import { TipoDescuento } from './tipo-descuento.entity';
import { Paciente } from '../../pacientes/paciente.entity';
import { Servicios } from '../../catalogos/servicios.entity';
import { Paquete } from '../../catalogos/paquete.entity';

@Entity('venta_servicio_detalle')
export class VentaServicioDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'venta_id' })
  venta_id: number;

  @ManyToOne(() => VentaServicio, (v) => v.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_id' })
  venta: VentaServicio;

  @Column({ name: 'paciente_id', comment: 'Paciente que recibe este servicio' })
  paciente_id: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ name: 'servicio_id' })
  servicio_id: number;

  @ManyToOne(() => Servicios)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @Column({ name: 'tipo_venta_id', comment: '1=Sesión unitaria, 2=Paquete' })
  tipo_venta_id: number;

  @ManyToOne(() => TipoVentaServicio)
  @JoinColumn({ name: 'tipo_venta_id' })
  tipo_venta: TipoVentaServicio;

  @Column({ name: 'paquete_id', nullable: true, comment: 'Solo si tipo_venta_id = 2' })
  paquete_id: number;

  @ManyToOne(() => Paquete, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paquete_id' })
  paquete: Paquete;

  @Column({ type: 'int' })
  sesiones_totales: number;

  @Column({ type: 'int', default: 0 })
  sesiones_usadas: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio_unitario: number;

  @Column({ name: 'descuento_tipo_id', nullable: true, comment: 'Descuento por línea: 1=Porcentaje, 2=Monto fijo' })
  descuento_tipo_id: number;

  @ManyToOne(() => TipoDescuento, { nullable: true })
  @JoinColumn({ name: 'descuento_tipo_id' })
  descuento_tipo: TipoDescuento;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, comment: 'Valor ingresado del descuento por línea' })
  descuento_valor: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, comment: 'Monto calculado del descuento por línea' })
  descuento_monto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'precio_unitario - descuento_monto' })
  subtotal: number;
}
