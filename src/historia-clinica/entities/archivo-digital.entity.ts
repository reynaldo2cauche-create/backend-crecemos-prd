import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { TipoArchivo } from './tipo-archivo.entity';

@Entity('archivos_digitales')
export class ArchivoDigital {
  @PrimaryGeneratedColumn()
  id: number;
 
  @Column({ name: 'requiere_verificacion', type: 'enum', enum: ['TERAPIA', 'OFICIAL'], default: 'TERAPIA' })
  requiereVerificacion: 'TERAPIA' | 'OFICIAL';
  
  @Column({ name: 'cod_verificacion', type: 'varchar', length: 9, unique: true, nullable: true })
  codVerificacion: string;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255, nullable: false })
  nombreArchivo: string;

  @Column({ name: 'nombre_original', type: 'varchar', length: 255, nullable: false })
  nombreOriginal: string;

  @Column({ name: 'tipo_mime', type: 'varchar', length: 100, nullable: false })
  tipoMime: string;

  @Column({ name: 'tamano', type: 'bigint', nullable: false })
  tamano: number;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'ruta_archivo', type: 'varchar', length: 255, nullable: false })
  rutaArchivo: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'fecha_creacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({ name: 'fecha_actualizacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  fechaActualizacion: Date;

  // Relaciones
  @ManyToOne(() => Paciente, { nullable: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro, { nullable: false })
  @JoinColumn({ name: 'terapeuta_id' })
  terapeuta: TrabajadorCentro;

  @ManyToOne(() => TipoArchivo, { nullable: false })
  @JoinColumn({ name: 'tipo_archivo_id' })
  tipoArchivo: TipoArchivo;
}
