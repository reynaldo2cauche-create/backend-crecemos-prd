import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

export type EstadoFichaSeguimiento = 'PENDIENTE' | 'COMPLETADA';
export type ValorEscala = 'L' | 'EP' | 'N';

// Helpers de decorador reutilizables
const Escala = () =>
  Column({ type: 'enum', enum: ['L', 'EP', 'N'], nullable: true });
const Obs = () => Column({ type: 'text', nullable: true });
const Bool = () => Column({ type: 'boolean', default: false });
const Texto = () => Column({ type: 'text', nullable: true });

/**
 * Ficha de Seguimiento Escolar (Terapia de Lenguaje).
 * Cada pregunta del formato es una columna (nada de JSON). Admisión/Administrador genera
 * la solicitud → token único; la docente la llena UNA sola vez y queda COMPLETADA.
 */
@Entity('ficha_seguimiento_escolar')
export class FichaSeguimientoEscolar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  paciente_id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({ type: 'enum', enum: ['PENDIENTE', 'COMPLETADA'], default: 'PENDIENTE' })
  estado: EstadoFichaSeguimiento;

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
  aula: string;

  @Column({ type: 'text', nullable: true })
  institucion_educativa: string;

  // ─── COMUNICACIÓN FUNCIONAL ───
  @Escala() cf1: ValorEscala; @Obs() cf1_obs: string;
  @Escala() cf2: ValorEscala; @Obs() cf2_obs: string;
  @Escala() cf3: ValorEscala; @Obs() cf3_obs: string;
  @Escala() cf4: ValorEscala; @Obs() cf4_obs: string;
  @Escala() cf5: ValorEscala; @Obs() cf5_obs: string;
  @Escala() cf6: ValorEscala; @Obs() cf6_obs: string;

  // ─── COMPRENSIÓN DEL LENGUAJE ───
  @Escala() cl1: ValorEscala; @Obs() cl1_obs: string;
  @Escala() cl2: ValorEscala; @Obs() cl2_obs: string;
  @Escala() cl3: ValorEscala; @Obs() cl3_obs: string;
  @Escala() cl4: ValorEscala; @Obs() cl4_obs: string;
  @Escala() cl5: ValorEscala; @Obs() cl5_obs: string;

  // ─── VOCABULARIO Y LENGUAJE EXPRESIVO ───
  @Escala() ve1: ValorEscala; @Obs() ve1_obs: string;
  @Escala() ve2: ValorEscala; @Obs() ve2_obs: string;
  @Escala() ve3: ValorEscala; @Obs() ve3_obs: string;
  @Escala() ve4: ValorEscala; @Obs() ve4_obs: string;
  @Escala() ve5: ValorEscala; @Obs() ve5_obs: string;

  // ─── INTERACCIÓN Y COMUNICACIÓN SOCIAL ───
  @Escala() is1: ValorEscala; @Obs() is1_obs: string;
  @Escala() is2: ValorEscala; @Obs() is2_obs: string;
  @Escala() is3: ValorEscala; @Obs() is3_obs: string;
  @Escala() is4: ValorEscala; @Obs() is4_obs: string;
  @Escala() is5: ValorEscala; @Obs() is5_obs: string;
  @Escala() is6: ValorEscala; @Obs() is6_obs: string;

  // ─── JUEGO E IMITACIÓN ───
  @Escala() ji1: ValorEscala; @Obs() ji1_obs: string;
  @Escala() ji2: ValorEscala; @Obs() ji2_obs: string;
  @Escala() ji3: ValorEscala; @Obs() ji3_obs: string;
  @Escala() ji4: ValorEscala; @Obs() ji4_obs: string;
  @Escala() ji5: ValorEscala; @Obs() ji5_obs: string;

  // ─── REGISTRO DE LENGUAJE ESPONTÁNEO ───
  @Texto() palabras_espontaneas: string;
  @Texto() frases_escuchadas: string;
  @Bool() usa_pedir_objetos: boolean;
  @Bool() usa_pedir_ayuda: boolean;
  @Bool() usa_rechazar: boolean;
  @Bool() usa_elegir: boolean;
  @Bool() usa_llamar_persona: boolean;
  @Bool() usa_responder_preguntas: boolean;
  @Bool() usa_comentar_espontaneo: boolean;
  @Texto() usa_otro: string;

  // ─── INTERACCIÓN CON COMPAÑEROS (juego libre) ───
  @Bool() jl_juega_solo: boolean;
  @Bool() jl_cerca_otros: boolean;
  @Bool() jl_observa_imita: boolean;
  @Bool() jl_permite_otros: boolean;
  @Bool() jl_busca_otros: boolean;
  @Bool() jl_juegos_turnos: boolean;
  @Texto() jl_ejemplo: string;

  // ─── ESTRATEGIAS QUE MEJOR FUNCIONAN ───
  @Bool() est_pausa_expectante: boolean;
  @Bool() est_frases_breves: boolean;
  @Bool() est_una_indicacion: boolean;
  @Bool() est_mostrar_visual: boolean;
  @Bool() est_modelar_palabra: boolean;
  @Bool() est_materiales_interes: boolean;
  @Bool() est_dos_alternativas: boolean;
  @Bool() est_incorporarse_juego: boolean;
  @Bool() est_canciones_movimiento: boolean;
  @Texto() est_otro: string;

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
