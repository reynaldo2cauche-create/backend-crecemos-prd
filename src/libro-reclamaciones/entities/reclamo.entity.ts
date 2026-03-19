import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { LibroReclamacionesEstado } from './estado.entity';
import { LibroReclamacionesTipoSolicitud } from './tipo-solicitud.entity';
import { LibroReclamacionesTipoBien } from './tipo-bien.entity';
import { LibroReclamacionesDocumento } from './documento.entity';
import { LibroReclamacionesSeguimiento } from './seguimiento.entity';

@Entity('libro_reclamaciones')
export class LibroReclamacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  codigo_reclamo: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha_registro: Date;

  // Datos del consumidor
  @Column({ type: 'varchar', length: 150 })
  nombres: string;

  @Column({ type: 'varchar', length: 150 })
  apellidos: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  tipo_documento: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  numero_documento: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ type: 'boolean', default: false })
  menor_edad: boolean;

  @Column({ type: 'text', nullable: true })
  datos_apoderado: string;

  // Tipo de bien y solicitud
  @Column({ type: 'int', nullable: true })
  tipo_bien_id: number;

  @ManyToOne(() => LibroReclamacionesTipoBien)
  @JoinColumn({ name: 'tipo_bien_id' })
  tipoBien: LibroReclamacionesTipoBien;

  @Column({ type: 'int', nullable: true })
  tipo_solicitud_id: number;

  @ManyToOne(() => LibroReclamacionesTipoSolicitud)
  @JoinColumn({ name: 'tipo_solicitud_id' })
  tipoSolicitud: LibroReclamacionesTipoSolicitud;

  @Column({ type: 'text', nullable: true })
  descripcion_bien: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monto_reclamado: number;

  // Detalle del reclamo
  @Column({ type: 'text' })
  detalle_reclamo: string;

  @Column({ type: 'text' })
  pedido_consumidor: string;

  // Respuesta
  @Column({ type: 'text', nullable: true })
  respuesta_proveedor: string;

  @Column({ type: 'datetime', nullable: true })
  fecha_respuesta: Date;

  // Estado
  @Column({ type: 'int', nullable: true })
  estado_id: number;

  @ManyToOne(() => LibroReclamacionesEstado)
  @JoinColumn({ name: 'estado_id' })
  estado: LibroReclamacionesEstado;

  // Firma digital (consentimiento)
  @Column({ type: 'boolean', default: false })
  acepta_terminos: boolean;

  @Column({ type: 'boolean', default: false })
  autoriza_datos: boolean;

  // Evidencia técnica (reemplaza firma)
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_registro: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ type: 'datetime', nullable: true })
  fecha_aceptacion: Date;

  // Evidencia del proveedor
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_respuesta: string;

  @Column({ type: 'int', nullable: true })
  usuario_respuesta_id: number;

  // Relaciones
  @OneToMany(() => LibroReclamacionesDocumento, doc => doc.reclamo)
  documentos: LibroReclamacionesDocumento[];

  @OneToMany(() => LibroReclamacionesSeguimiento, seg => seg.reclamo)
  seguimientos: LibroReclamacionesSeguimiento[];
}
