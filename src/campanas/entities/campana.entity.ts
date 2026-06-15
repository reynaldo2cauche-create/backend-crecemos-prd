import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CampanaEstado } from './campana-estado.entity';
import { CampanaSeccion } from './campana-seccion.entity';
import { TrabajadorCentro } from 'src/usuarios/trabajador-centro.entity';

// Devuelve los datetime como texto local 'YYYY-MM-DD HH:mm:ss' (sin convertir a UTC),
// para que el frontend reciba la hora tal cual se guardó.
const dtTransformer = {
  to: (v?: string) => v ?? null,
  from: (v?: Date | string) => {
    if (!v) return v as any;
    if (typeof v === 'string') return v;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  },
};

@Entity('campana')
export class Campana {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion_corta: string;

  @Column({ type: 'datetime', transformer: dtTransformer })
  fecha_inicio: string;

  @Column({ type: 'datetime', transformer: dtTransformer })
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
