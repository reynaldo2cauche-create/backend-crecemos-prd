
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { LibroReclamacionDocumento } from './libro-reclamacion-documento.entity';
import { LibroReclamacionSeguimiento } from './libro-reclamacion-seguimiento.entity';

@Entity('libro_reclamaciones')
export class LibroReclamacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero_reclamo: string;

  // Datos del consumidor
  @Column() tipo_documento: string;
  @Column() numero_documento: string;
  @Column() nombres: string;
  @Column() apellidos: string;
  @Column() domicilio: string;
  @Column() departamento: string;
  @Column() provincia: string;
  @Column() distrito: string;
  @Column() telefono: string;
  @Column() email: string;

  // Datos del bien o servicio
  @Column() bien_contratado: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monto_reclamo: number;
  @Column({ type: 'text' }) detalle_bien: string;

  // Detalle del reclamo
  @Column() tipo_reclamo: string;
  @Column({ type: 'date' }) fecha_hecho: string;
  @Column() lugar_hecho: string;
  @Column({ type: 'text' }) detalle_reclamo: string;
  @Column({ type: 'text' }) pedido_consumidor: string;

  // Control y seguimiento
  @Column({ default: 'RECIBIDO' }) estado: string;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_registro: Date;
  @Column({ type: 'datetime', nullable: true }) fecha_respuesta: Date;
  @Column({ type: 'text', nullable: true }) respuesta: string;
  @Column({ nullable: true }) responsable_respuesta_id: number;

  // Declaraciones
  @Column({ type: 'tinyint', default: 0 }) acepta_terminos: number;
  @Column({ type: 'tinyint', default: 0 }) autoriza_procesamiento: number;

  // Auditoría
  @Column({ type: 'tinyint', default: 1 }) activo: number;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  fecha_actualizacion: Date;

  // Relaciones
  @OneToMany(() => LibroReclamacionDocumento, doc => doc.reclamo)
  documentos: LibroReclamacionDocumento[];

  @OneToMany(() => LibroReclamacionSeguimiento, seg => seg.reclamo)
  seguimientos: LibroReclamacionSeguimiento[];
}
