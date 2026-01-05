import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { Atenciones } from '../../catalogos/atenciones.entity';
import { RelacionPadres } from '../../catalogos/relacion-padres.entity';
import { GradoEscolar } from '../../catalogos/grado-escolar.entity';
import { HermanoEntrevista } from './hermano-entrevista.entity';
import { FamiliarEntrevista } from './familiar-entrevista.entity';

@Entity('entrevistas_padres')
export class EntrevistaPadres {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paciente_id' })
  pacienteId: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'int' })
  escolaridad: number;

  @Column({ name: 'motivo_consulta', type: 'text' })
  motivoConsulta: string;

  @Column({ name: 'otras_atenciones', type: 'int', nullable: true })
  otrasAtenciones: number;

  @Column({ name: 'antecedentes_familiares', length: 10 })
  antecedentesFamiliares: string;

  @Column({ name: 'antecedentes_medicos', type: 'text', nullable: true })
  antecedentesMedicos: string;

  @Column({ name: 'antecedentes_psiquiatricos', type: 'text', nullable: true })
  antecedentesPsiquiatricos: string;

  @Column({ name: 'antecedentes_toxicologicos', type: 'text', nullable: true })
  antecedentesToxicologicos: string;

  @Column({ name: 'relacion_entre_padres', type: 'int', nullable: true })
  relacionEntrePadres: number;

  @Column({ name: 'detalle_relacion_padres', type: 'text', nullable: true })
  detalleRelacionPadres: string;

  @Column({ name: 'cantidad_hermanos', length: 10 })
  cantidadHermanos: string;

  @Column({ name: 'tiempo_juego', length: 100, nullable: true })
  tiempoJuego: string;

  @Column({ name: 'tiempo_dispositivos', length: 100, nullable: true })
  tiempoDispositivos: string;

  @Column({ name: 'antecedentes_prenatales', type: 'text', nullable: true })
  antecedentesPrenatales: string;

  @Column({ name: 'desarrollo_motor', type: 'text', nullable: true })
  desarrolloMotor: string;

  @Column({ name: 'desarrollo_lenguaje', type: 'text', nullable: true })
  desarrolloLenguaje: string;

  @Column({ type: 'text', nullable: true })
  alimentacion: string;

  @Column({ type: 'text', nullable: true })
  sueno: string;

  @Column({ name: 'control_esfinteres', type: 'text', nullable: true })
  controlEsfinteres: string;

  @Column({ name: 'antecedentes_medicos_nino', type: 'text', nullable: true })
  antecedentesMedicosNino: string;

  @Column({ name: 'antecedentes_escolares', type: 'text', nullable: true })
  antecedentesEscolares: string;

  @Column({ name: 'relacion_pares', length: 100, nullable: true })
  relacionPares: string;

  @Column({ name: 'expresion_emocional', type: 'text', nullable: true })
  expresionEmocional: string;

  @Column({ name: 'relacion_autoridad', type: 'text', nullable: true })
  relacionAutoridad: string;

  @Column({ name: 'juegos_preferidos', type: 'text', nullable: true })
  juegosPreferidos: string;

  @Column({ name: 'actividades_favoritas', type: 'text', nullable: true })
  actividadesFavoritas: string;

  @Column({ type: 'text', nullable: true })
  recomendaciones: string;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actua' })
  fechaActua: Date;

  @Column({ name: 'user_id_actua', nullable: true })
  userIdActua: number;

  @Column({ default: true })
  activo: boolean;

  // Relaciones
  @ManyToOne(() => Paciente, paciente => paciente.entrevistasPadres)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'user_id_actua' })
  usuarioActua: TrabajadorCentro;

  @ManyToOne(() => Atenciones)
  @JoinColumn({ name: 'otras_atenciones' })
  atenciones: Atenciones;

  @ManyToOne(() => RelacionPadres)
  @JoinColumn({ name: 'relacion_entre_padres' })
  relacionPadres: RelacionPadres;

  @ManyToOne(() => GradoEscolar)
  @JoinColumn({ name: 'escolaridad' })
  gradoEscolar: GradoEscolar;

  // Relaciones OneToMany
  @OneToMany(() => HermanoEntrevista, hermano => hermano.entrevista)
  hermanos: HermanoEntrevista[];

  @OneToMany(() => FamiliarEntrevista, familiar => familiar.entrevista)
  familiares: FamiliarEntrevista[];
}