import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Entity('evaluacion_terapia_ocupacional')
export class EvaluacionTerapiaOcupacional {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paciente_id' })
  pacienteId: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @Column({ 
    type: 'date', 
    name: 'fecha_evaluacion',
    transformer: {
      to: (value: string) => value, // Guardar como string directo
      from: (value: Date) => {
        // Convertir de Date a string YYYY-MM-DD sin zona horaria
        if (!value) return null;
        const d = new Date(value);
        // Usar UTC para evitar problemas de zona horaria
        return d.toISOString().split('T')[0];
      }
    }
  })
  fechaEvaluacion: string;

  @Column({ type: 'text', nullable: true, name: 'motivo_consulta' })
  motivoConsulta: string;

  // 1. DATOS GENERALES
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tipo_parto' })
  tipoParto: string;

  @Column({ type: 'tinyint', default: 0, name: 'estimulacion_temprana' })
  estimulacionTemprana: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'terapias_anteriores' })
  terapiasAnteriores: boolean;

  @Column({ type: 'text', nullable: true, name: 'observaciones_datos_generales' })
  observacionesDatosGenerales: string;

  // 2. OBSERVACIONES GENERALES
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'nivel_alerta' })
  nivelAlerta: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'nivel_atencion' })
  nivelAtencion: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'nivel_actividad' })
  nivelActividad: string;

  // 3. COMPONENTE SENSORIAL - VISUALES
  @Column({ type: 'tinyint', default: 0, name: 'usa_lentes' })
  usaLentes: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'fijacion_visual' })
  fijacionVisual: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'contacto_visual' })
  contactoVisual: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'seguimiento_visual' })
  seguimientoVisual: boolean;

  @Column({ type: 'text', nullable: true, name: 'observaciones_visuales' })
  observacionesVisuales: string;

  // 3. COMPONENTE SENSORIAL - AUDITIVAS
  @Column({ type: 'tinyint', default: 0, name: 'reconoce_fuentes_sonoras' })
  reconoceFuentesSonoras: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'busca_sonido' })
  buscaSonido: boolean;

  @Column({ type: 'text', nullable: true, name: 'observaciones_auditivas' })
  observacionesAuditivas: string;

  // 3. COMPONENTE SENSORIAL - TÁCTILES
  @Column({ type: 'tinyint', default: 0, name: 'desordenes_modulacion' })
  desordenesModulacion: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'hiperresponsividad_tactil' })
  hiperresponsividadTactil: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'hiporresponsividad_tactil' })
  hiporresponsividadTactil: boolean;

  @Column({ type: 'text', nullable: true, name: 'observaciones_tactiles' })
  observacionesTactiles: string;

  // 3. COMPONENTE SENSORIAL - GUSTATIVOS
  @Column({ type: 'tinyint', default: 0, name: 'selectividad_comidas' })
  selectividadComidas: boolean;
  
    @Column({ type: 'text', nullable: true, name: 'observaciones_gustativos' })
    observacionesGustativos: string;

  // 3. COMPONENTE SENSORIAL - PROPIOCEPTIVO
  @Column({ type: 'tinyint', default: 0, name: 'hiperresponsividad_propioceptivo' })
  hiperresponsividadPropioceptivo: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'hiporresponsividad_propioceptivo' })
  hiporresponsividadPropioceptivo: boolean;

  @Column({ type: 'text', nullable: true, name: 'observaciones_propioceptivo' })
  observacionesPropioceptivo: string;

  // 3. COMPONENTE SENSORIAL - VESTIBULAR
  @Column({ type: 'tinyint', default: 0, name: 'inseguridad_gravitacional' })
  inseguridadGravitacional: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'intolerancia_movimiento' })
  intoleranciaMovimiento: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'hiporrespuesta_movimiento' })
  hiporrespuestaMovimiento: boolean;

  @Column({ type: 'text', nullable: true, name: 'observaciones_vestibular' })
  observacionesVestibular: string;

  // 4. COMPONENTE MOTOR
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'fuerza_muscular' })
  fuerzaMuscular: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'rango_articular' })
  rangoArticular: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'coordinacion_bimanual' })
  coordinacionBimanual: string;

  @Column({ type: 'tinyint', default: 0, name: 'cruce_linea_media' })
  cruceLineaMedia: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'dominacion_manual' })
  dominacionManual: string;

  @Column({ type: 'text', nullable: true, name: 'observaciones_motor' })
  observacionesMotor: string;

  // 5. COMPONENTE PSICOLÓGICO
  @Column({ type: 'text', nullable: true })
  intereses: string;

  // 6. COMPONENTE COGNITIVO
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'atencion_concentracion' })
  atencionConcentracion: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'seguimiento_ordenes' })
  seguimientoOrdenes: string;

  @Column({ type: 'text', nullable: true, name: 'otros_cognitivo' })
  otrosCognitivo: string;

  // 7. AVD - ALIMENTACIÓN
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'alimentacion_independiente' })
  alimentacionIndependiente: string;

  @Column({ type: 'text', nullable: true, name: 'observacion_alimentacion' })
  observacionAlimentacion: string;

  // 7. AVD - VESTIDO
  @Column({ type: 'tinyint', default: 0, name: 'desvestido_superior' })
  desvestidoSuperior: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'desvestido_inferior' })
  desvestidoInferior: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'vestido_superior' })
  vestidoSuperior: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'vestido_inferior' })
  vestidoInferior: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'manejo_botones' })
  manejoBotones: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'manejo_cierre' })
  manejoCierre: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'manejo_lazos' })
  manejoLazos: boolean;

  @Column({ type: 'text', nullable: true, name: 'observacion_vestido' })
  observacionVestido: string;

  // 7. AVD - HIGIENE
  @Column({ type: 'tinyint', default: 0, name: 'esfinter_vesical' })
  esfinterVesical: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'esfinter_anal' })
  esfinterAnal: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'lavado_manos' })
  lavadoManos: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'lavado_cara' })
  lavadoCara: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'cepillado_dientes' })
  cepilladoDientes: boolean;

  @Column({ type: 'text', nullable: true, name: 'observacion_higiene' })
  observacionHigiene: string;

  // 8. ÁREA ESCOLAR
  @Column({ type: 'tinyint', default: 0, name: 'prension_lapiz_imitado' })
  prensionLapizImitado: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'prension_lapiz_copiado' })
  prensionLapizCopiado: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'prension_lapiz_coloreado' })
  prensionLapizColoreado: boolean;

  @Column({ type: 'tinyint', default: 0 })
  recortado: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'prension_tijeras' })
  prensionTijeras: string;

  @Column({ type: 'text', nullable: true, name: 'observacion_escolar' })
  observacionEscolar: string;

  // 9. ÁREA DEL DESEMPEÑO - JUEGO
  @Column({ type: 'text', nullable: true, name: 'juguetes_preferidos' })
  juguetesPreferidos: string;

  @Column({ type: 'tinyint', default: 0, name: 'tipo_juego_sensoriomotor' })
  tipoJuegoSensoriomotor: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'tipo_juego_simbolico' })
  tipoJuegoSimbolico: boolean;

  @Column({ type: 'tinyint', default: 0, name: 'tipo_juego_otro' })
  tipoJuegoOtro: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'lugar_preferido_jugar' })
  lugarPreferidoJugar: string;

  @Column({ type: 'text', nullable: true, name: 'observacion_juego' })
  observacionJuego: string;

  // 10. COMUNICACIÓN
  @Column({ type: 'text', nullable: true })
  lenguaje: string;

  // 11-13. CONCLUSIONES, SUGERENCIAS Y OBJETIVOS
  @Column({ type: 'text', nullable: true })
  conclusiones: string;

  @Column({ type: 'text', nullable: true })
  sugerencias: string;

  @Column({ type: 'text', nullable: true, name: 'objetivos_iniciales' })
  objetivosIniciales: string;

  // AUDITORÍA
  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @Column({ name: 'creado_por', nullable: true })
  creadoPor: number;

  @ManyToOne(() => TrabajadorCentro)
  @JoinColumn({ name: 'creado_por' })
  usuario: TrabajadorCentro;

}