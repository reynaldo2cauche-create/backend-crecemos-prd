import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_comprobante')
export class TipoComprobante {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ length: 50 })
  nombre: string;
}