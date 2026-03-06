import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { IndicacionTerapeutica } from './indicacion-terapeutica.entity';
import { MotivoCita } from '../../catalogos/motivo-cita.entity';
import { Modalidad } from '../../catalogos/modalidad.entity';
import { Frecuencia } from '../../catalogos/frecuencia.entity';

@Entity('indicacion_cita')
export class IndicacionCita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'indicacion_id' })
  indicacionId: number;

  @Column({ name: 'tipo_id' })
  tipoId: number;

  @Column({ name: 'modalidad_id' })
  modalidadId: number;

  @Column({ name: 'frecuencia_id' })
  frecuenciaId: number;

  @Column({ name: 'cantidad_citas', nullable: true })
  cantidadCitas: number;

  @Column({ name: 'informe_fisico', default: false })
  informeFisico: boolean;

  @Column({ name: 'informe_verbal', default: false })
  informeVerbal: boolean;

  // Relaciones
  @ManyToOne(() => IndicacionTerapeutica, indicacion => indicacion.citas)
  @JoinColumn({ name: 'indicacion_id' })
  indicacion: IndicacionTerapeutica;

  @ManyToOne(() => MotivoCita)
  @JoinColumn({ name: 'tipo_id' })
  tipo: MotivoCita;

  @ManyToOne(() => Modalidad)
  @JoinColumn({ name: 'modalidad_id' })
  modalidad: Modalidad;

  @ManyToOne(() => Frecuencia)
  @JoinColumn({ name: 'frecuencia_id' })
  frecuencia: Frecuencia;
}
