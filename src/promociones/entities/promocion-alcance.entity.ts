import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Promocion } from './promocion.entity';
import { TipoAlcancePromo } from './tipo-alcance-promo.entity';
import { MotivoCita } from '../../catalogos/motivo-cita.entity';

@Entity('promocion_alcance')
@Unique('uq_alcance', [
  'promocion_id',
  'tipo_alcance_id',
  'referencia_id',
  'motivo_cita_id',
])
export class PromocionAlcance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  promocion_id: number;

  @ManyToOne(() => Promocion, (promocion) => promocion.alcances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'promocion_id' })
  promocion: Promocion;

  @Column({ type: 'tinyint', unsigned: true })
  tipo_alcance_id: number;

  @ManyToOne(() => TipoAlcancePromo)
  @JoinColumn({ name: 'tipo_alcance_id' })
  tipo_alcance: TipoAlcancePromo;

  @Column({
    type: 'int',
    comment:
      'ID del producto, categoría, servicio o paquete según tipo_alcance_id',
  })
  referencia_id: number;

  @Column({
    type: 'int',
    nullable: true,
    comment:
      'Solo para tipo_alcance_id=3 (Servicio). NULL = todos los motivos de cita',
  })
  motivo_cita_id: number;

  @ManyToOne(() => MotivoCita, { nullable: true })
  @JoinColumn({ name: 'motivo_cita_id' })
  motivo_cita: MotivoCita;
}
