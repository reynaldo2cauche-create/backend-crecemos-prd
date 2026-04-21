import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_descuento')
export class TipoDescuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, comment: 'Porcentaje, Monto fijo' })
  nombre: string;
}
