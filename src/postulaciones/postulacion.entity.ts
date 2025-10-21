import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Comentario } from './comentario.entity';

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

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 100 })
  distrito: string;

  @Column({ type: 'varchar', length: 50 })
  cargo_postulado: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  documentos_adjuntos: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP(6)' })
  fecha_postulacion: Date;

  @Column({
    type: 'enum',
    enum: ['Nuevo', 'En revisión', 'Contactado', 'Por entrevistar', 'Rechazado', 'Contratado'],
    default: 'Nuevo'
  })
  estado_postulacion: string;

  @OneToMany(() => Comentario, comentario => comentario.postulacion)
  comentarios: Comentario[];
}