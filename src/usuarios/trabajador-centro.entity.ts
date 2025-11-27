import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Institucion } from '../evaluaciones/institucion.entity';
import { Rol } from './rol.entity';
import { Especialidad } from './especialidad.entity';
import { Pago } from '../rrhh/pago.entity';
import { Vacacion } from '../rrhh/vacacion.entity';
import { CuentaBancaria } from '../rrhh/cuenta-bancaria.entity';

@Entity('trabajador_centro')
export class TrabajadorCentro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @Column({ unique: true })
  dni: string;

  @Column({ unique: true })
  username?: string;

  @Column()
  password?: string;

  @Column({ unique: true })
  email?: string;

  @Column({ nullable: true })
  telefono?: string;

  @Column({ nullable: true })
  telefono_emergencia?: string;

  @Column({ nullable: true })
  contacto_emergencia?: string;

  @Column({ nullable: true })
  direccion?: string;

  @Column({ nullable: true })
  distrito?: string;

  @Column({ nullable: true })
  provincia?: string;

  @Column({ nullable: true })
  departamento?: string;

  @Column({ nullable: true })
  talla_polo?: string;

  @Column({ nullable: true })
  talla_pantalon?: string;

  @Column({ nullable: true })
  talla_zapatos?: string;

  @Column()
  cargo: string;

  @ManyToOne(() => Rol, { eager: true })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @ManyToOne(() => Especialidad, { eager: true, nullable: true })
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;

  @ManyToOne(() => Institucion, { eager: true })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion;

  @Column({ default: true })
  estado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_acceso: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  // Campos de RR.HH.
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  sueldo_base: number;

  @Column({ type: 'date', nullable: true })
  fecha_ingreso: Date;

  @Column({ nullable: true })
  numero_cuenta: string;

  @Column({ nullable: true })
  banco: string;

  @OneToMany(() => Pago, pago => pago.empleado)
  pagos: Pago[];

  @OneToMany(() => Vacacion, vacacion => vacacion.empleado)
  vacaciones: Vacacion[];

  @OneToMany(() => CuentaBancaria, cuenta => cuenta.trabajador)
  cuentas_bancarias: CuentaBancaria[];

} 