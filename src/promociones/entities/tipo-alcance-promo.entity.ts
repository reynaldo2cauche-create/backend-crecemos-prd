import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_alcance_promo')
export class TipoAlcancePromo {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;
}
