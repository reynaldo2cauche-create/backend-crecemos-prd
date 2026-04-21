import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('modalidad_pago')
export class ModalidadPago {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;
}
