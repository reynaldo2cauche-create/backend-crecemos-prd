import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { VentaProducto } from "./venta-producto.entity";
import { ModalidadPago } from "src/historia-clinica/entities/modalidad-pago.entity";

@Entity('venta_producto_pago')
export class VentaProductoPago {
  @PrimaryGeneratedColumn() id: number;

  @Column() venta_id: number;
  @ManyToOne(() => VentaProducto, v => v.pagos)
  @JoinColumn({ name: 'venta_id' })
  venta: VentaProducto;

  @Column() modalidad_pago_id: number;
  @ManyToOne(() => ModalidadPago)
  @JoinColumn({ name: 'modalidad_pago_id' })
  modalidad_pago: ModalidadPago;

  @Column('decimal', { precision: 10, scale: 2 }) monto: number;
  @Column({ nullable: true }) referencia: string;
  @CreateDateColumn() created_at: Date;
}
