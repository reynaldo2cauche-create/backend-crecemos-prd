import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_venta_servicio')
export class TipoVentaServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, comment: 'Sesión unitaria, Paquete' })
  nombre: string;
}
