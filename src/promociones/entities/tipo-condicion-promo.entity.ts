import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_condicion_promo')
export class TipoCondicionPromo {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;
}
