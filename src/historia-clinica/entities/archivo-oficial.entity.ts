// src/archivos/entities/archivo-oficial.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { TipoArchivo } from './tipo-archivo.entity';

@Entity('archivos_oficiales')
export class ArchivoOficial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paciente_id', nullable: true })
  pacienteId: number;

  @Column({ name: 'trabajador_id', nullable: true })
  trabajadorId: number;

  @Column({ name: 'terapeuta_id' })
  terapeutaId?: number;

  @Column({ name: 'trabajador_subio_id' })
  trabajadorSubioId: number;

  @Column({ name: 'tipo_archivo_id' })
  tipoArchivoId: number;

  // Datos del archivo
  @Column({ name: 'nombre_archivo' })
  nombreArchivo: string;

  @Column({ name: 'nombre_original' })
  nombreOriginal: string;

  @Column({ name: 'tipo_mime' })
  tipoMime: string;

  @Column({ type: 'bigint' })
  tamano: number;

  @Column({ name: 'ruta_archivo' })
  rutaArchivo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  // Sistema de validación
  @Column({ name: 'codigo_validacion', unique: true })
  codigoValidacion: string;

  @Column({ name: 'fecha_emision', type: 'date' })
  fechaEmision: Date;

  @Column({ name: 'fecha_vigencia', type: 'date', nullable: true })
  fechaVigencia: Date;

  @Column({ type: 'tinyint', default: 1 })
  activo: number;

  // Entrega digital (virtual) — obligatoria
  @Column({ name: 'entrega_digital', type: 'tinyint', default: 0 })
  entregaDigital: number;

  @Column({ name: 'fecha_entrega_digital', type: 'datetime', nullable: true, default: null })
  fechaEntregaDigital: Date | null;

  @Column({ name: 'entregado_digital_por_id', nullable: true, default: null })
  entregadoDigitalPorId: number | null;

  // Entrega física — opcional
  @Column({ name: 'entrega_fisica', type: 'tinyint', default: 0 })
  entregaFisica: number;

  @Column({ name: 'fecha_entrega_fisica', type: 'datetime', nullable: true, default: null })
  fechaEntregaFisica: Date | null;

  @Column({ name: 'entregado_fisico_por_id', nullable: true, default: null })
  entregadoFisicoPorId: number | null;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  // Relaciones
  @ManyToOne(() => Paciente, { nullable: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'trabajador_subio_id' })
  trabajadorSubio: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'entregado_digital_por_id' })
  entregadoDigitalPor: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'entregado_fisico_por_id' })
  entregadoFisicoPor: TrabajadorCentro;

  @ManyToOne(() => TipoArchivo)
  @JoinColumn({ name: 'tipo_archivo_id' })
  tipoArchivo: TipoArchivo;
}