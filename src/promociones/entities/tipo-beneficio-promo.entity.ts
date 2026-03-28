import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_beneficio_promo')
export class TipoBeneficioPromo {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;
}
