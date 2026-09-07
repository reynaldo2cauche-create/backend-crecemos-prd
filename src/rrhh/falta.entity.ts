import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { TipoFalta } from './tipo-falta.entity';
import { Mes } from './mes.entity';
import { Pago } from './pago.entity';

@Entity('faltas')
export class Falta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrabajadorCentro, { eager: true })
  @JoinColumn({ name: 'trabajador_id' })
  empleado: TrabajadorCentro;

  @ManyToOne(() => TipoFalta, { eager: true })
  @JoinColumn({ name: 'tipo_falta_id' })
  tipo: TipoFalta;

  @Column({ type: 'date' })
  fecha_inicio: Date;

  @Column({ type: 'date' })
  fecha_fin: Date;

  @Column({ default: true })
  descuenta: boolean; // resuelto al registrar (RRHH decide)

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  dias: number; // días laborables dentro del rango según horario

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  valor_dia: number; // snapshot del valor día al registrar

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  monto_descuento: number; // dias * valor_dia si descuenta (snapshot)

  @ManyToOne(() => Mes, { eager: true })
  @JoinColumn({ name: 'mes_id' })
  mes: Mes;

  @Column()
  anio: number;

  @ManyToOne(() => Pago, { nullable: true })
  @JoinColumn({ name: 'pago_id' })
  pago: Pago; // se marca cuando el mes ya fue pagado (evita doble descuento)

  @Column({ type: 'text', nullable: true })
  observaciones: string;

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
