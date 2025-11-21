import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Comentario } from './comentario.entity';
import { CargoPostulacion } from './cargo-postulacion.entity';
import { EstadoPostulacion } from './estado-postulacion.entity';

@Entity('postulaciones')
export class Postulacion {
  @PrimaryGeneratedColumn()
  id_postulacion: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  apellido: string;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 15 })
  telefono: string;

  @Column({ type: 'varchar', length: 100 })
  distrito: string;

  // ✅ RELACIÓN: Pero exponemos como string para mantener compatibilidad
  @ManyToOne(() => CargoPostulacion, cargo => cargo.postulaciones, { eager: true })
  @JoinColumn({ name: 'cargo_postulacion_id' })
  cargoPostulacionRelacion: CargoPostulacion;

  // ✅ VIRTUAL: Este campo NO existe en BD, es calculado
  cargo_postulado: string;

  @ManyToOne(() => EstadoPostulacion, { eager: true })
  @JoinColumn({ name: 'estado_postulacion_id' })
  estadoPostulacionRelacion: EstadoPostulacion;

  // ✅ VIRTUAL: Este campo NO existe en BD, es calculado
  estado_postulacion: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  documentos_adjuntos: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha_postulacion: Date;

  @OneToMany(() => Comentario, (comentario) => comentario.postulacion)
  comentarios: Comentario[];
}