import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn
} from 'typeorm';
import { SorteoGanador } from './sorteo-ganador.entity';
import { SorteoParticipante } from './sorteo-participante.entity';
import { EstadoSorteo } from './estado-sorteo.entity';
import { TrabajadorCentro } from 'src/usuarios/trabajador-centro.entity';

@Entity('sorteos')
export class Sorteo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({ type: 'date', name: 'fecha_inicio', nullable: true })
  fechaInicio: Date;

  @Column({ type: 'date', name: 'fecha_fin', nullable: true })
  fechaFin: Date;

  @Column({ type: 'datetime', name: 'fecha_sorteo', nullable: true })
  fechaSorteo: Date;

  @Column({ type: 'int', name: 'cantidad_ganadores', nullable: true })
  cantidadGanadores: number;

  @Column({ type: 'int', name: 'estado_sorteo_id', default: 1 })
  estadoSorteoId: number;

  @ManyToOne(() => EstadoSorteo, { nullable: false })
  @JoinColumn({ name: 'estado_sorteo_id' })
  estadoSorteo: EstadoSorteo;

  @OneToMany(() => SorteoGanador, ganador => ganador.sorteo)
  ganadores: SorteoGanador[];

  @OneToMany(() => SorteoParticipante, participante => participante.sorteo)
  participantes: SorteoParticipante[];

  @Column({ type: 'int', name: 'user_crea_id', nullable: true })
  userCreaId: number;

  @Column({ type: 'int', name: 'user_actua_id', nullable: true })
  userActuaId: number;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_crea_id' })
  userCrea: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_actua_id' })
  userActua: TrabajadorCentro;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}