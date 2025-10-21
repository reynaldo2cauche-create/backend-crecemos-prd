import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Postulacion } from './postulacion.entity';

@Entity('comentarios_postulacion')
export class Comentario {
  @PrimaryGeneratedColumn()
  id_comentario: number;

  @Column({ name: 'id_postulacion' })
  id_postulacion: number;

  @Column({ name: 'id_trabajador' })
  id_trabajador: number;

  @Column({ type: 'text' })
  comentario: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP(6)' })
  fecha_comentario: Date;

  @ManyToOne(() => Postulacion, postulacion => postulacion.comentarios)
  @JoinColumn({ name: 'id_postulacion' })
  postulacion: Postulacion;
}