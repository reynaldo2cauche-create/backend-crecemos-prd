import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_producto')
export class TipoProducto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nombre: string;
}