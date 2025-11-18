
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { TipoArchivo } from './tipo-archivo.entity';

@Entity('archivos_terapia')
export class ArchivoTerapia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paciente_id' })
  pacienteId: number;

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

  // Control de visibilidad
  @Column({ name: 'es_compartido', type: 'tinyint', default: 0 })
  esCompartido: number;

  @Column({ type: 'tinyint', default: 1 })
  activo: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  // Relaciones
  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'trabajador_subio_id' })
  trabajadorSubio: TrabajadorCentro;

  @ManyToOne(() => TipoArchivo)
  @JoinColumn({ name: 'tipo_archivo_id' })
  tipoArchivo: TipoArchivo;
}
