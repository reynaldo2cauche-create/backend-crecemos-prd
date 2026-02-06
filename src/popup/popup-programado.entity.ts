import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('popups_programados')
@Index(['fechaInicio', 'fechaFin'])
@Index(['activo'])
export class PopupProgramado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ name: 'imagen_url', type: 'varchar', length: 500 })
  imagenUrl: string;

  @Column({ name: 'fecha_inicio', type: 'datetime' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'datetime' })
  fechaFin: Date;

  @Column({ name: 'mensaje_whatsapp', nullable: true }) // 👈 NUEVO CAMPO
  mensajeWhatsapp: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true, name: 'user_id_crea' })
  userIdCrea: number;

  @Column({ nullable: true, name: 'user_id_actua' })
  userIdActua: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
