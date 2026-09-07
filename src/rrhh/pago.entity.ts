import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { TipoSueldo } from './tipo-sueldo.entity';
import { Mes } from './mes.entity';
import { PeriodoGratificacion } from './periodo-gratificacion.entity';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrabajadorCentro, trabajador => trabajador.pagos, { eager: true })
  @JoinColumn({ name: 'trabajador_id' })
  empleado: TrabajadorCentro;

  @ManyToOne(() => TipoSueldo, { eager: true })
  @JoinColumn({ name: 'tipo_sueldo_id' })
  tipo_sueldo: TipoSueldo;

  @ManyToOne(() => Mes, { eager: true })
  @JoinColumn({ name: 'mes_id' })
  mes: Mes;

  @Column({ nullable: true })
  anio: number;

  @ManyToOne(() => PeriodoGratificacion, { eager: true, nullable: true })
  @JoinColumn({ name: 'periodo_gratificacion_id' })
  periodo_gratificacion: PeriodoGratificacion;

  @Column('decimal', { precision: 10, scale: 2 })
  monto: number; // Monto total del pago

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  monto_sueldo: number; // Desglose: monto del sueldo base

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  monto_gratificacion: number; // Desglose: monto de gratificación

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  monto_descuento: number; // Total descontado por faltas en este pago (informativo)

  @Column({ type: 'date' })
  fecha_pago: Date;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id_crea' })
  usuarioCrea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id_actua' })
  usuarioActualiza: TrabajadorCentro;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
