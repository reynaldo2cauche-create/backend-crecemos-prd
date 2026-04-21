import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CampanaEstado } from './campana-estado.entity';
import { CampanaSeccion } from './campana-seccion.entity';
import { TrabajadorCentro } from 'src/usuarios/trabajador-centro.entity';

@Entity('campana')
export class Campana {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  titulo: string;

  @Column({ length: 500, nullable: true })
  descripcion_corta: string;

  @Column({ type: 'date' })
  fecha_inicio: string;

  @Column({ type: 'date' })
  fecha_fin: string;

  @Column({ name: 'estado_id', default: 2 })
  estado_id: number;

  @ManyToOne(() => CampanaEstado)
  @JoinColumn({ name: 'estado_id' })
  estado: CampanaEstado;

  @Column({ default: 0 })
  orden: number;

  @Column({ name: 'user_crea_id', nullable: true })
  user_crea_id: number;

  @Column({ name: 'user_actua_id', nullable: true })
  user_actua_id: number;

  @OneToMany(() => CampanaSeccion, seccion => seccion.campana)
  secciones: CampanaSeccion[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_crea_id' })
  usuarioCrea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_actua_id' })
  usuarioActualiza: TrabajadorCentro;
}
