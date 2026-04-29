import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { VentaServicio } from "./venta-servicio.entity";
import { ModalidadPago } from "src/historia-clinica/entities/modalidad-pago.entity";

// venta-servicio-pago.entity.ts
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
  @CreateDateColumn() created_at: Date;
}