import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { IndicacionTerapeutica } from './indicacion-terapeutica.entity';

@Entity('indicacion_recomendaciones')
export class IndicacionRecomendaciones {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'indicacion_id' })
  indicacionId: number;

  // Preimpresas (siempre activas)
  @Column({ name: 'asistir_puntualmente', default: true })
  asistirPuntualmente: boolean;

  @Column({ name: 'evitar_faltar_sin_aviso', default: true })
  evitarFaltarSinAviso: boolean;

  @Column({ name: 'practicar_en_casa', default: true })
  practicarEnCasa: boolean;

  // Opcionales
  @Column({ name: 'dedicar_15_20_min_diarios', default: false })
  dedicar1520MinDiarios: boolean;

  @Column({ name: 'evitar_corregir_bruscamente', default: false })
  evitarCorregirBruscamente: boolean;

  @Column({ name: 'crear_ambiente_rico', default: false })
  crearAmbienteRico: boolean;

  @Column({ name: 'informar_cambios', default: false })
  informarCambios: boolean;

  @Column({ name: 'evitar_pantallas_excesivas', default: false })
  evitarPantallasExcesivas: boolean;

  // Terapia Ocupacional
  @Column({ name: 'dedicar_15_20_min_actividades', default: false })
  dedicar1520MinActividades: boolean;

  @Column({ name: 'establecer_rutina_estructurada', default: false })
  establecerRutinaEstructurada: boolean;

  @Column({ name: 'favorecer_autonomia', default: false })
  favorecerAutonomia: boolean;

  @Column({ name: 'realizar_actividades_motricidad', default: false })
  realizarActividadesMotricidad: boolean;

  // Terapia Lenguaje Adultos
  @Column({ name: 'evitar_corregirse_con_frustracion', default: false })
  evitarCorregirseConFrustracion: boolean;

  @Column({ name: 'evitar_distracciones_practica', default: false })
  evitarDistraccionesPractica: boolean;

  @Column({ name: 'notificar_cambios_salud', default: false })
  notificarCambiosSalud: boolean;

  @Column({ name: 'realizar_ejercicios_ensenados', default: false })
  realizarEjerciciosEnsenados: boolean;

  @Column({ name: 'involucrar_familiar_cuidador', default: false })
  involucrarFamiliarCuidador: boolean;

  // Terapia Deglutoria
  @Column({ name: 'mantener_sentado_90_grados', default: false })
  mantenerSentado90Grados: boolean;

  @Column({ name: 'evitar_comer_acostado', default: false })
  evitarComerAcostado: boolean;

  @Column({ name: 'ofrecer_porciones_pequenas', default: false })
  ofrecerPorcionesPequenas: boolean;

  @Column({ name: 'verificar_trago_completo', default: false })
  verificarTragoCompleto: boolean;

  @Column({ name: 'permitir_tiempo_entre_bocados', default: false })
  permitirTiempoEntreBocados: boolean;

  @Column({ name: 'evitar_hablar_con_alimento', default: false })
  evitarHablarConAlimento: boolean;

  @Column({ name: 'evitar_apresurar_alimentacion', default: false })
  evitarApresurarAlimentacion: boolean;

  @Column({ name: 'dieta_tipo_pure', default: false })
  dietaTipoPure: boolean;

  @Column({ name: 'usar_espesante_liquidos', default: false })
  usarEspesanteLiquidos: boolean;

  // Psicología Infantil
  @Column({ name: 'fomentar_ambiente_confianza', default: false })
  fomentarAmbienteConfianza: boolean;

  @Column({ name: 'evitar_etiquetas_negativas', default: false })
  evitarEtiquetasNegativas: boolean;

  @Column({ name: 'tener_paciencia_expectativas_realistas', default: false })
  tenerPacienciaExpectativasRealistas: boolean;

  // Psicología Adolescentes
  @Column({ name: 'evitar_confrontaciones_inmediatas', default: false })
  evitarConfrontacionesInmediatas: boolean;

  @Column({ name: 'respetar_espacio_terapeutico', default: false })
  respetarEspacioTerapeutico: boolean;

  @Column({ name: 'cumplir_tareas_familia', default: false })
  cumplirTareasFamilia: boolean;

  // Terapia Pareja y Familiar
  @Column({ name: 'ambos_asistir_sesiones', default: false })
  ambosAsistirSesiones: boolean;

  @Column({ name: 'evitar_discutir_temas_sensibles', default: false })
  evitarDiscutirTemasSensibles: boolean;

  @Column({ name: 'actitud_apertura_respeto', default: false })
  actitudAperturaRespeto: boolean;

  @Column({ name: 'comprometerse_sin_buscar_culpables', default: false })
  comprometerSeBuscarCulpables: boolean;

  @Column({ name: 'no_decisiones_impulsivas', default: false })
  noDecisionesImpulsivas: boolean;

  // Psicoterapia
  @Column({ name: 'ser_honesto_terapeuta', default: false })
  serHonestoTerapeuta: boolean;

  @Column({ name: 'evitar_juzgarse', default: false })
  evitarJuzgarse: boolean;

  @Column({ name: 'registrar_pensamientos_emociones', default: false })
  registrarPensamientosEmociones: boolean;

  @Column({ name: 'informar_eventos_importantes', default: false })
  informarEventosImportantes: boolean;

  @Column({ length: 255, nullable: true })
  otros: string;

  // Relación
  @ManyToOne(() => IndicacionTerapeutica, indicacion => indicacion.recomendaciones)
  @JoinColumn({ name: 'indicacion_id' })
  indicacion: IndicacionTerapeutica;
}
