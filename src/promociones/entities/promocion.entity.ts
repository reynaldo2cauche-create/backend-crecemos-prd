import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { PromocionRegla } from './promocion-regla.entity';
import { PromocionAlcance } from './promocion-alcance.entity';

@Entity('promocion')
export class Promocion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '1 = aplica a todo el catálogo sin excepciones',
  })
  aplica_todo: number;

  @Column({ type: 'date' })
  fecha_inicio: Date;

  @Column({ type: 'date', nullable: true, comment: 'NULL = sin vencimiento' })
  fecha_fin: Date;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '1 = se puede combinar con otras promociones',
  })
  flg_acumulable: number;

  @Column({ type: 'tinyint', default: 1 })
  flg_activo: number;

  @Column({ type: 'int', nullable: true })
  user_crea_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_crea_id' })
  user_crea: TrabajadorCentro;

  @Column({ type: 'int', nullable: true })
  user_actua_id: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_actua_id' })
  user_actua: TrabajadorCentro;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relaciones
  @OneToMany(() => PromocionRegla, (regla) => regla.promocion, {
    cascade: true,
  })
  reglas: PromocionRegla[];

  @OneToMany(() => PromocionAlcance, (alcance) => alcance.promocion, {
    cascade: true,
  })
  alcances: PromocionAlcance[];
}
