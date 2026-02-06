import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Institucion } from '../evaluaciones/institucion.entity';
import { Rol } from './rol.entity';
import { Especialidad } from './especialidad.entity';
import { Cargo } from './cargo.entity';
import { Pago } from '../rrhh/pago.entity';
import { Vacacion } from '../rrhh/vacacion.entity';
import { CuentaBancaria } from '../rrhh/cuenta-bancaria.entity';
import { EstadoCivil } from '../catalogos/estado-civil.entity';
import { Parentesco } from '../catalogos/parentesco.entity';
import { Sexo } from '../catalogos/sexo.entity';
import { DatosAcademicos } from './datos-academicos.entity';
import { NivelEducacion } from '../catalogos/nivel-educacion.entity';
import { Distrito } from '../catalogos/distrito.entity';

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
  correo_corporativo?: string;

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

  @Column({ type: 'varchar', length: 50, nullable: true })
  numero_colegiatura?: string;

  // Datos personales adicionales
  @Column({ type: 'date', nullable: true })
  fecha_nacimiento?: Date;

  @ManyToOne(() => Sexo, { eager: true, nullable: true })
  @JoinColumn({ name: 'sexo_id' })
  sexo?: Sexo;

  @ManyToOne(() => EstadoCivil, { eager: true, nullable: true })
  @JoinColumn({ name: 'estado_civil_id' })
  estado_civil?: EstadoCivil;

  @Column({ type: 'int', nullable: true })
  hijos?: number;

  // Datos de contacto adicionales
  @Column({ type: 'varchar', length: 100, nullable: true })
  pais?: string;

  @Column({ type: 'text', nullable: true })
  referencia_direccion?: string;

  @ManyToOne(() => Distrito, { eager: true, nullable: true })
  @JoinColumn({ name: 'distrito_id' })
  distrito_rel?: Distrito;

  @Column({ nullable: true })
  distrito_id?: number;

  @ManyToOne(() => Parentesco, { eager: true, nullable: true })
  @JoinColumn({ name: 'parentesco_emergencia_id' })
  parentesco_emergencia?: Parentesco;

  // Datos laborales adicionales
  @Column({ type: 'varchar', length: 200, nullable: true })
  procedencia_laboral?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  area_laboral?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  empresa_anterior?: string;

  @Column({ type: 'text', nullable: true })
  motivo_renuncia?: string;

  // Datos adicionales
  @Column({ type: 'text', nullable: true })
  hobbies?: string;

  @Column({ type: 'text', nullable: true })
  opciones_regalo?: string;



  // Datos académicos principales
  @ManyToOne(() => NivelEducacion, { eager: true, nullable: true })
  @JoinColumn({ name: 'nivel_educacion_id' })
  nivel_educacion?: NivelEducacion;

  @Column({ type: 'varchar', length: 255, nullable: true })
  centro_estudios_principal?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  carrera_estudiada_principal?: string;

  @Column({ type: 'date', nullable: true })
  fecha_inicio_estudio?: Date;

  @Column({ type: 'date', nullable: true })
  fecha_termino_estudio?: Date;

  // Archivos adjuntos
  @Column({ type: 'varchar', length: 255, nullable: true })
  archivo_cv?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  archivo_dni?: string;

  @ManyToOne(() => Rol, { eager: true, nullable: true })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @ManyToOne(() => Especialidad, { eager: true, nullable: true })
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;

  @ManyToOne(() => Cargo, { eager: true, nullable: true })
  @JoinColumn({ name: 'cargo_id' })
  cargo: Cargo;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'jefe_id' })
  jefe: TrabajadorCentro;

  @OneToMany(() => TrabajadorCentro, trabajador => trabajador.jefe)
  subordinados: TrabajadorCentro[];

  @ManyToOne(() => Institucion, { eager: true, nullable: true })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion;

  @Column({ default: true })
  estado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_acceso: Date;

  @Column({ type: 'int', default: 1, comment: 'Versión de sesión para control de login único' })
  session_version: number;

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

  @OneToMany(() => DatosAcademicos, datos => datos.trabajador)
  datos_academicos: DatosAcademicos[];

} 