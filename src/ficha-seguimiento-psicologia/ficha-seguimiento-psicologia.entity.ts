import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

export type EstadoFichaPsicologia = 'PENDIENTE' | 'COMPLETADA';
// Escala Conners: 0=Nunca, 1=Sólo un poco, 2=Bastante, 3=Mucho
export type ValorConners = 0 | 1 | 2 | 3;

// Helpers de decorador reutilizables
const Escala = () => Column({ type: 'tinyint', nullable: true });
const Texto = () => Column({ type: 'text', nullable: true });

/**
 * Ficha de Seguimiento Escolar (Psicología) — Cuestionario para Maestros de Conners.
 * Cada reactivo del formato es una columna (nada de JSON). Admisión/Administrador genera
 * la solicitud → token único; la docente la llena UNA sola vez y queda COMPLETADA.
 */
@Entity('ficha_seguimiento_psicologia')
export class FichaSeguimientoPsicologia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  paciente_id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({ type: 'enum', enum: ['PENDIENTE', 'COMPLETADA'], default: 'PENDIENTE' })
  estado: EstadoFichaPsicologia;

  // ─── Cabecera definida por Admisión al generar (opcional) ───
  @Column({ type: 'text', nullable: true })
  periodo_observacion: string;

  @Column({ type: 'date', nullable: true })
  fecha_entrega: Date;

  @Column({ type: 'date', nullable: true })
  fecha_devolucion: Date;

  // ─── Cabecera que llena la docente ───
  @Column({ type: 'text', nullable: true })
  docente_nombre: string;

  @Column({ type: 'text', nullable: true })
  nivel_grado: string;

  @Column({ type: 'text', nullable: true })
  institucion_educativa: string;

  // ─── CONDUCTA EN EL SALÓN DE CLASES (1..21) ───
  @Escala() sc1: ValorConners;
  @Escala() sc2: ValorConners;
  @Escala() sc3: ValorConners;
  @Escala() sc4: ValorConners;
  @Escala() sc5: ValorConners;
  @Escala() sc6: ValorConners;
  @Escala() sc7: ValorConners;
  @Escala() sc8: ValorConners;
  @Escala() sc9: ValorConners;
  @Escala() sc10: ValorConners;
  @Escala() sc11: ValorConners;
  @Escala() sc12: ValorConners;
  @Escala() sc13: ValorConners;
  @Escala() sc14: ValorConners;
  @Escala() sc15: ValorConners;
  @Escala() sc16: ValorConners;
  @Escala() sc17: ValorConners;
  @Escala() sc18: ValorConners;
  @Escala() sc19: ValorConners;
  @Escala() sc20: ValorConners;
  @Escala() sc21: ValorConners;

  // ─── PARTICIPACIÓN EN GRUPO (22..29) ───
  @Escala() pg1: ValorConners;
  @Escala() pg2: ValorConners;
  @Escala() pg3: ValorConners;
  @Escala() pg4: ValorConners;
  @Escala() pg5: ValorConners;
  @Escala() pg6: ValorConners;
  @Escala() pg7: ValorConners;
  @Escala() pg8: ValorConners;

  // ─── ACTITUD HACIA LA AUTORIDAD (30..39) ───
  @Escala() aa1: ValorConners;
  @Escala() aa2: ValorConners;
  @Escala() aa3: ValorConners;
  @Escala() aa4: ValorConners;
  @Escala() aa5: ValorConners;
  @Escala() aa6: ValorConners;
  @Escala() aa7: ValorConners;
  @Escala() aa8: ValorConners;
  @Escala() aa9: ValorConners;
  @Escala() aa10: ValorConners;

  // ─── COMENTARIOS ───
  @Texto() comentarios: string;

  // ─── Metadatos ───
  @Column({ nullable: true })
  user_id_crea: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_crea: Date;

  @Column({ type: 'datetime', nullable: true })
  fecha_completado: Date;

  @ManyToOne(() => Paciente, { eager: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro, { nullable: true })
  @JoinColumn({ name: 'user_id_crea' })
  usuarioCreador: TrabajadorCentro;
}
