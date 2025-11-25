import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrabajadorCentro, trabajador => trabajador.pagos, { eager: true })
  @JoinColumn({ name: 'trabajador_id' })
  empleado: TrabajadorCentro;

  @Column()
  tipo: string; // gratificacion, bono, aguinaldo

  @Column('decimal', { precision: 10, scale: 2 })
  monto: number; // Monto total del pago

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  montoSueldo: number; // Desglose: monto del sueldo base

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  montoGratificacion: number; // Desglose: monto de gratificación

  @Column()
  periodo: string; // julio-2024, diciembre-2024

  @Column({ nullable: true })
  mes: string; // enero, febrero, marzo, etc.

  @Column({ nullable: true })
  anio: number; // 2024, 2025, etc.

  @Column({ type: 'date' })
  fechaPago: Date;

  @Column({ nullable: true })
  registradoPor: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
