import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LibroReclamacion } from './reclamo.entity';
import { LibroReclamacionesEstado } from './estado.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('libro_reclamaciones_seguimiento')
export class LibroReclamacionesSeguimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  reclamo_id: number;

  @ManyToOne(() => LibroReclamacion, reclamo => reclamo.seguimientos)
  @JoinColumn({ name: 'reclamo_id' })
  reclamo: LibroReclamacion;

  @Column({ type: 'int', nullable: true })
  estado_id: number;

  @ManyToOne(() => LibroReclamacionesEstado)
  @JoinColumn({ name: 'estado_id' })
  estado: LibroReclamacionesEstado;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ type: 'int', nullable: true })
  usuario_id: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;
}
