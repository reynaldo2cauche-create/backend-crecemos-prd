import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Campana } from './campana.entity';
import { TrabajadorCentro } from 'src/usuarios/trabajador-centro.entity';

@Entity('campana_seccion')
export class CampanaSeccion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campana_id' })
  campana_id: number;

  @ManyToOne(() => Campana, campana => campana.secciones, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'campana_id' })
  campana: Campana;

  @Column({ length: 255, nullable: true })
  titulo: string;

  @Column({ type: 'longtext' })
  contenido: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ name: 'user_crea_id', nullable: false })
  user_crea_id: number;

  @Column({ name: 'user_actua_id', nullable: true })
  user_actua_id: number;

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
