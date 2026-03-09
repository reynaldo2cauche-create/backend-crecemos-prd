import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { TipoBloqueo } from '../../catalogos/tipo-bloqueo.entity';

@Entity('bloqueo_horarios')
export class BloqueoHorarios {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'trabajador_id' })
  trabajadorId: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  @Column({ name: 'tipo_bloqueo_id' })
  tipoBloqueoId: number;

  @ManyToOne(() => TipoBloqueo)
  @JoinColumn({ name: 'tipo_bloqueo_id' })
  tipoBloqueo: TipoBloqueo;

  @Column({ type: 'date', name: 'fecha_inicio' })
  fechaInicio: string;

  @Column({ type: 'date', name: 'fecha_fin' })
  fechaFin: string;

  @Column({ type: 'tinyint', nullable: true, name: 'dia_semana' })
  diaSemana: number;

  @Column({ type: 'boolean', default: false, name: 'todo_el_dia' })
  todoElDia: boolean;

  @Column({ type: 'time', nullable: true, name: 'hora_inicio' })
  horaInicio: string;

  @Column({ type: 'time', nullable: true, name: 'hora_fin' })
  horaFin: string;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ nullable: true, name: 'user_id_crea' })
  userIdCrea: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'user_id_crea' })
  userCrea: TrabajadorCentro;

  @Column({ nullable: true, name: 'user_id_actua' })
  userIdActua: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'user_id_actua' })
  userActua: TrabajadorCentro;

  @Column({ type: 'timestamp', nullable: true, name: 'fecha_actua' })
  fechaActua: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
