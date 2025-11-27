import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

@Entity('cuentas_bancarias')
export class CuentaBancaria {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: false })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  @Column()
  banco: string;

  @Column()
  numero_cuenta: string;

  @Column({ nullable: true })
  cci: string;

  @Column({ default: false })
  es_principal: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
