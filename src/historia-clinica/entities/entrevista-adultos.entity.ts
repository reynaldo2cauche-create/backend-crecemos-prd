import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('entrevistas_adultos')
export class EntrevistaAdultos {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paciente_id' })
  pacienteId: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ type: 'date' })
  fecha: Date;

  // i. DATOS GENERALES
  @Column({ name: 'nombre', length: 200, nullable: true })
  nombre: string;

  @Column({ name: 'edad', length: 20, nullable: true })
  edad: string;

  @Column({ name: 'genero', length: 50, nullable: true })
  genero: string;

  @Column({ name: 'lugar_nacimiento', length: 300, nullable: true })
  lugarNacimiento: string;

  @Column({ name: 'fecha_nacimiento', type: 'date', nullable: true })
  fechaNacimiento: Date;

  @Column({ name: 'domicilio_actual', length: 300, nullable: true })
  domicilioActual: string;

  @Column({ name: 'telefono', length: 50, nullable: true })
  telefono: string;

  @Column({ name: 'estado_civil', length: 100, nullable: true })
  estadoCivil: string;

  @Column({ length: 100, nullable: true })
  religion: string;

  @Column({ length: 100, nullable: true })
  escolaridad: string;

  @Column({ length: 200, nullable: true })
  ocupacion: string;

  @Column({ name: 'remitido_por_id', nullable: true })
  remitidoPorId: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'remitido_por_id' })
  remitidoPor: TrabajadorCentro;

  // ii. MOTIVO DE CONSULTA
  @Column({ name: 'motivo_consulta', type: 'text', nullable: true })
  motivoConsulta: string;

  // iii. ANTECEDENTES DE LA SITUACIÓN
  @Column({ name: 'antecedentes_situacion', type: 'text', nullable: true })
  antecedentesSituacion: string;

  @Column({ name: 'funciones_organicas', type: 'text', nullable: true })
  funcionesOrganicas: string;

  // iv. HISTORIA FAMILIAR - PADRE
  @Column({ name: 'nombre_padre', length: 200, nullable: true })
  nombrePadre: string;

  @Column({ name: 'edad_padre', length: 50, nullable: true })
  edadPadre: string;

  @Column({ name: 'escolaridad_ocupacion_padre', length: 200, nullable: true })
  escolaridadOcupacionPadre: string;

  @Column({ name: 'enfermedades_padre', type: 'text', nullable: true })
  enfermedadesPadre: string;

  @Column({ name: 'relacion_padre_paciente', type: 'text', nullable: true })
  relacionPadrePaciente: string;

  @Column({ name: 'imposicion_castigos_padre', type: 'text', nullable: true })
  imposicionCastigosPadre: string;

  // iv. HISTORIA FAMILIAR - MADRE
  @Column({ name: 'nombre_madre', length: 200, nullable: true })
  nombreMadre: string;

  @Column({ name: 'edad_madre', length: 50, nullable: true })
  edadMadre: string;

  @Column({ name: 'escolaridad_ocupacion_madre', length: 200, nullable: true })
  escolaridadOcupacionMadre: string;

  @Column({ name: 'enfermedades_madre', type: 'text', nullable: true })
  enfermedadesMadre: string;

  @Column({ name: 'relacion_madre_paciente', type: 'text', nullable: true })
  relacionMadrePaciente: string;

  @Column({ name: 'imposicion_castigos_madre', type: 'text', nullable: true })
  imposicionCastigosMadre: string;

  // iv. HISTORIA FAMILIAR - HERMANOS Y ANTECEDENTES
  @Column({ name: 'relacion_hermanos', type: 'text', nullable: true })
  relacionHermanos: string;

  @Column({ name: 'antecedentes_medicos_psiquiatricos_familia', type: 'text', nullable: true })
  antecedentesMedicosPsiquiatricosFamilia: string;

  // v. SÍNTOMAS NEURÓTICOS
  @Column({ name: 'pesadillas_presente', default: false })
  pesadillasPresente: boolean;

  @Column({ name: 'pesadillas_detalle', length: 300, nullable: true })
  pesadillasDetalle: string;

  @Column({ name: 'terror_nocturno_presente', default: false })
  terrorNocturnoPresente: boolean;

  @Column({ name: 'terror_nocturno_detalle', length: 300, nullable: true })
  terrorNocturnoDetalle: string;

  @Column({ name: 'sonambulismo_presente', default: false })
  sonambulismoPresente: boolean;

  @Column({ name: 'sonambulismo_detalle', length: 300, nullable: true })
  sonambulismoDetalle: string;

  @Column({ name: 'enuresis_presente', default: false })
  enuresisPresente: boolean;

  @Column({ name: 'enuresis_detalle', length: 300, nullable: true })
  enuresisDetalle: string;

  @Column({ name: 'onicofagia_presente', default: false })
  onicofagiaPresente: boolean;

  @Column({ name: 'onicofagia_detalle', length: 300, nullable: true })
  onicofagiaDetalle: string;

  @Column({ name: 'obsesiones_compulsiones_presente', default: false })
  obsesionesCompulsionesPresente: boolean;

  @Column({ name: 'obsesiones_compulsiones_detalle', length: 300, nullable: true })
  obsesionesCompulsionesDetalle: string;

  @Column({ name: 'fobias_presente', default: false })
  fobiasPresente: boolean;

  @Column({ name: 'fobias_detalle', length: 300, nullable: true })
  fobiasDetalle: string;

  @Column({ name: 'inquietud_presente', default: false })
  inquietudPresente: boolean;

  @Column({ name: 'inquietud_detalle', length: 300, nullable: true })
  inquietudDetalle: string;

  @Column({ name: 'miedo_estar_solo_presente', default: false })
  miedoEstarSoloPresente: boolean;

  @Column({ name: 'miedo_estar_solo_detalle', length: 300, nullable: true })
  miedoEstarSoloDetalle: string;

  // vi. SALUD FÍSICA
  @Column({ length: 200, nullable: true })
  infecciones: string;

  @Column({ length: 200, nullable: true })
  cefalea: string;

  @Column({ length: 200, nullable: true })
  convulsiones: string;

  @Column({ name: 'enfermedades_respiratorias', length: 200, nullable: true })
  enfermedadesRespiratorias: string;

  @Column({ name: 'intervenciones_quirurgicas', type: 'text', nullable: true })
  intervencionesQuirurgicas: string;

  // vii. SOCIALIZACIÓN
  @Column({ type: 'text', nullable: true })
  socializacion: string;

  @Column({ name: 'conducta_universidad_trabajo', type: 'text', nullable: true })
  conductaUniversidadTrabajo: string;

  @Column({ name: 'ocupacion_actual_detalles', type: 'text', nullable: true })
  ocupacionActualDetalles: string;

  // viii. ANTECEDENTES PERSONALES
  @Column({ name: 'circunstancia_embarazo', type: 'text', nullable: true })
  circunstanciaEmbarazo: string;

  @Column({ name: 'planificado_reaccion_padres', type: 'text', nullable: true })
  planificadoReaccionPadres: string;

  @Column({ name: 'tipo_parto', type: 'text', nullable: true })
  tipoParto: string;

  @Column({ name: 'recien_nacido', type: 'text', nullable: true })
  recienNacido: string;

  @Column({ type: 'text', nullable: true })
  lactancia: string;

  @Column({ name: 'desarrollo_motor', type: 'text', nullable: true })
  desarrolloMotor: string;

  @Column({ name: 'control_esfinteres', type: 'text', nullable: true })
  controlEsfinteres: string;

  @Column({ name: 'informacion_sexual_adquirida', type: 'text', nullable: true })
  informacionSexualAdquirida: string;

  @Column({ name: 'enfermedades_venereas', type: 'text', nullable: true })
  enfermedadesVenereas: string;

  @Column({ name: 'periodo_menstrual', length: 200, nullable: true })
  periodoMenstrual: string;

  @Column({ name: 'sintomas_menstruacion', type: 'text', nullable: true })
  sintomasMenstruacion: string;

  // ix. HISTORIAL SEXUAL
  @Column({ name: 'opinion_noviazgo_matrimonio', type: 'text', nullable: true })
  opinionNoviazgoMatrimonio: string;

  @Column({ name: 'experiencias_noviazgo_matrimonio', type: 'text', nullable: true })
  experienciasNoviazgoMatrimonio: string;

  // x. HÁBITOS Y ASPECTOS JUDICIALES
  @Column({ name: 'alcohol_presente', default: false })
  alcoholPresente: boolean;

  @Column({ name: 'alcohol_detalle', length: 300, nullable: true })
  alcohol: string;

  @Column({ name: 'tabaco_presente', default: false })
  tabacoPresente: boolean;

  @Column({ name: 'tabaco_detalle', length: 300, nullable: true })
  tabaco: string;

  @Column({ name: 'drogas_presente', length: 300, nullable: true })
  drogasPresente: string;

  @Column({ name: 'drogas_detalle', type: 'text', nullable: true })
  drogas: string;

  @Column({ name: 'acusado_detenido_preso', type: 'text', nullable: true })
  acusadoDetenidoPreso: string;

  @Column({ name: 'acusado_detenido_detalle', type: 'text', nullable: true })
  acusadoDetenidoDetalle: string;

  // xi. PERSONALIDAD PREVIA
  @Column({ name: 'seguridad_si_mismo', length: 200, nullable: true })
  seguridadSiMismo: string;

  @Column({ name: 'toma_decisiones', length: 200, nullable: true })
  tomaDecisiones: string;

  @Column({ name: 'miedo_abandono', type: 'text', nullable: true })
  miedoAbandono: string;

  @Column({ name: 'confianza_otros', length: 200, nullable: true })
  confianzaOtros: string;

  @Column({ name: 'actos_impulsivos', type: 'text', nullable: true })
  actosImpulsivos: string;

  @Column({ name: 'preocupacion_rechazo_critica', type: 'text', nullable: true })
  preocupacionRechazoCritica: string;

  @Column({ name: 'preocupacion_fracaso', type: 'text', nullable: true })
  preocupacionFracaso: string;

  @Column({ name: 'gusto_ser_atractivo', type: 'text', nullable: true })
  gustoSerAtractivo: string;

  // xii. OBJETIVOS TERAPÉUTICOS INICIALES
  @Column({ name: 'objetivos_terapeuticos', type: 'text', nullable: true })
  objetivosTerapeuticos: string;

  // xiii. OBSERVACIONES GENERALES Y RECOMENDACIONES
  @Column({ name: 'observaciones_recomendaciones', type: 'text', nullable: true })
  observacionesRecomendaciones: string;

  // AUDITORÍA
  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actua' })
  fechaActua: Date;

  @Column({ name: 'user_id_actua', nullable: true })
  userIdActua: number;

  @Column({ default: true })
  activo: boolean;

  // RELACIONES
  @ManyToOne(() => Paciente, paciente => paciente.entrevistasAdultos)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'usuario_id' })
  usuario: TrabajadorCentro;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'user_id_actua' })
  usuarioActua: TrabajadorCentro;
}