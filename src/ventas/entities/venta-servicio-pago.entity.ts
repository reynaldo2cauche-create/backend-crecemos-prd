import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { VentaServicio } from "./venta-servicio.entity";
import { ModalidadPago } from "src/historia-clinica/entities/modalidad-pago.entity";
import { TrabajadorCentro } from "src/usuarios/trabajador-centro.entity";

@Entity('venta_servicio_pago')
export class VentaServicioPago {
  @PrimaryGeneratedColumn() id: number;

  @Column() venta_id: number;
  @ManyToOne(() => VentaServicio, v => v.pagos)
  @JoinColumn({ name: 'venta_id' })
  venta: VentaServicio;

  @Column() modalidad_pago_id: number;
  @ManyToOne(() => ModalidadPago)
  @JoinColumn({ name: 'modalidad_pago_id' })
  modalidad_pago: ModalidadPago;

  @Column('decimal', { precision: 10, scale: 2 }) monto: number;
  @Column({ nullable: true }) referencia: string;
  @Column({ type: 'datetime', nullable: true }) fecha_pago: string;

  @Column({ name: 'pago_validado', type: 'tinyint', width: 1, default: 0 })
  pago_validado: boolean;

  @Column({ name: 'pago_validado_por', type: 'int', unsigned: true, nullable: true })
  pago_validado_por: number | null;

  @ManyToOne(() => TrabajadorCentro, { nullable: true, eager: false })
  @JoinColumn({ name: 'pago_validado_por' })
  validado_por: TrabajadorCentro;

  @Column({ name: 'pago_validado_at', type: 'timestamp', nullable: true })
  pago_validado_at: Date | null;

  @CreateDateColumn() created_at: Date;
}