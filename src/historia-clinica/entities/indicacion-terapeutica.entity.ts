import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { Especialidad } from '../../usuarios/especialidad.entity';
import { Servicios } from '../../catalogos/servicios.entity';
import { IndicacionCita } from './indicacion-cita.entity';
import { IndicacionReferencia } from './indicacion-referencia.entity';
import { IndicacionRecomendaciones } from './indicacion-recomendaciones.entity';
import { IndicacionMateriales } from './indicacion-materiales.entity';

@Entity('indicacion_terapeutica')
export class IndicacionTerapeutica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'time' })
  hora: string;

  @Column({ name: 'paciente_id' })
  pacienteId: number;

  @Column({ name: 'trabajador_id' })
  trabajadorId: number;

  @Column({ name: 'especialidad_id' })
  especialidadId: number;

  @Column({ name: 'servicio_id' })
  servicioId: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'trabajador_id' })
  trabajador: TrabajadorCentro;

  @ManyToOne(() => Especialidad)
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Especialidad;

  @ManyToOne(() => Servicios)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicios;

  @OneToMany(() => IndicacionCita, cita => cita.indicacion, { cascade: true })
  citas: IndicacionCita[];

  @OneToMany(() => IndicacionReferencia, ref => ref.indicacion, { cascade: true })
  referencias: IndicacionReferencia[];

  @OneToMany(() => IndicacionRecomendaciones, rec => rec.indicacion, { cascade: true })
  recomendaciones: IndicacionRecomendaciones[];

  @OneToMany(() => IndicacionMateriales, mat => mat.indicacion, { cascade: true })
  materiales: IndicacionMateriales[];
}
