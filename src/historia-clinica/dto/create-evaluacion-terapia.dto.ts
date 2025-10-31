import { IsNotEmpty, IsNumber, IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreateEvaluacionTerapiaDto {
  @IsNotEmpty()
  @IsNumber()
  paciente_id: number;

  @IsNotEmpty()
  @IsNumber()
  usuario_id: number;

  @IsNotEmpty()
  @IsDateString()
  fecha_evaluacion: string;

  @IsOptional()
  @IsString()
  motivo_consulta?: string;

  // 1. DATOS GENERALES
  @IsOptional()
  @IsString()
  tipo_parto?: string;

  @IsOptional()
  @IsBoolean()
  estimulacion_temprana?: boolean;

  @IsOptional()
  @IsBoolean()
  terapias_anteriores?: boolean;

  @IsOptional()
  @IsString()
  observaciones_datos_generales?: string;

  // 2. OBSERVACIONES GENERALES
  @IsOptional()
  @IsString()
  nivel_alerta?: string;

  @IsOptional()
  @IsString()
  nivel_atencion?: string;

  @IsOptional()
  @IsString()
  nivel_actividad?: string;

  // 3. COMPONENTE SENSORIAL - VISUALES
  @IsOptional()
  @IsBoolean()
  usa_lentes?: boolean;

  @IsOptional()
  @IsBoolean()
  fijacion_visual?: boolean;

  @IsOptional()
  @IsBoolean()
  contacto_visual?: boolean;

  @IsOptional()
  @IsBoolean()
  seguimiento_visual?: boolean;

  @IsOptional()
  @IsString()
  observaciones_visuales?: string;

  // 3. COMPONENTE SENSORIAL - AUDITIVAS
  @IsOptional()
  @IsBoolean()
  reconoce_fuentes_sonoras?: boolean;

  @IsOptional()
  @IsBoolean()
  busca_sonido?: boolean;

  @IsOptional()
  @IsString()
  observaciones_auditivas?: string;

  // 3. COMPONENTE SENSORIAL - TÁCTILES
  @IsOptional()
  @IsBoolean()
  desordenes_modulacion?: boolean;

  @IsOptional()
  @IsBoolean()
  hiperresponsividad_tactil?: boolean;

  @IsOptional()
  @IsBoolean()
  hiporresponsividad_tactil?: boolean;

  @IsOptional()
  @IsString()
  observaciones_tactiles?: string;

  // 3. COMPONENTE SENSORIAL - GUSTATIVOS
  @IsOptional()
  @IsBoolean()
  selectividad_comidas?: boolean;
  
  @IsOptional()
  @IsString()
  // 3. COMPONENTE SENSORIAL - GUSTATIVOS
  observaciones_gustativos?: string;

  // 3. COMPONENTE SENSORIAL - PROPIOCEPTIVO
  @IsOptional()
  @IsBoolean()
  hiperresponsividad_propioceptivo?: boolean;

  @IsOptional()
  @IsBoolean()
  hiporresponsividad_propioceptivo?: boolean;

  @IsOptional()
  @IsString()
  observaciones_propioceptivo?: string;

  // 3. COMPONENTE SENSORIAL - VESTIBULAR
  @IsOptional()
  @IsBoolean()
  inseguridad_gravitacional?: boolean;

  @IsOptional()
  @IsBoolean()
  intolerancia_movimiento?: boolean;

  @IsOptional()
  @IsBoolean()
  hiporrespuesta_movimiento?: boolean;

  @IsOptional()
  @IsString()
  observaciones_vestibular?: string;

  // 4. COMPONENTE MOTOR
  @IsOptional()
  @IsString()
  fuerza_muscular?: string;

  @IsOptional()
  @IsString()
  rango_articular?: string;

  @IsOptional()
  @IsString()
  coordinacion_bimanual?: string;

  @IsOptional()
  @IsBoolean()
  cruce_linea_media?: boolean;

  @IsOptional()
  @IsString()
  dominacion_manual?: string;

  @IsOptional()
  @IsString()
  observaciones_motor?: string;

  // 5. COMPONENTE PSICOLÓGICO
  @IsOptional()
  @IsString()
  intereses?: string;

  // 6. COMPONENTE COGNITIVO
  @IsOptional()
  @IsString()
  atencion_concentracion?: string;

  @IsOptional()
  @IsString()
  seguimiento_ordenes?: string;

  @IsOptional()
  @IsString()
  otros_cognitivo?: string;

  // 7. AVD - ALIMENTACIÓN
  @IsOptional()
  @IsString()
  alimentacion_independiente?: string;

  @IsOptional()
  @IsString()
  observacion_alimentacion?: string;

  // 7. AVD - VESTIDO
  @IsOptional()
  @IsBoolean()
  desvestido_superior?: boolean;

  @IsOptional()
  @IsBoolean()
  desvestido_inferior?: boolean;

  @IsOptional()
  @IsBoolean()
  vestido_superior?: boolean;

  @IsOptional()
  @IsBoolean()
  vestido_inferior?: boolean;

  @IsOptional()
  @IsBoolean()
  manejo_botones?: boolean;

  @IsOptional()
  @IsBoolean()
  manejo_cierre?: boolean;

  @IsOptional()
  @IsBoolean()
  manejo_lazos?: boolean;

  @IsOptional()
  @IsString()
  observacion_vestido?: string;

  // 7. AVD - HIGIENE
  @IsOptional()
  @IsBoolean()
  esfinter_vesical?: boolean;

  @IsOptional()
  @IsBoolean()
  esfinter_anal?: boolean;

  @IsOptional()
  @IsBoolean()
  lavado_manos?: boolean;

  @IsOptional()
  @IsBoolean()
  lavado_cara?: boolean;

  @IsOptional()
  @IsBoolean()
  cepillado_dientes?: boolean;

  @IsOptional()
  @IsString()
  observacion_higiene?: string;

  // 8. ÁREA ESCOLAR
  @IsOptional()
  @IsBoolean()
  prension_lapiz_imitado?: boolean;

  @IsOptional()
  @IsBoolean()
  prension_lapiz_copiado?: boolean;

  @IsOptional()
  @IsBoolean()
  prension_lapiz_coloreado?: boolean;

  @IsOptional()
  @IsBoolean()
  recortado?: boolean;

  @IsOptional()
  @IsString()
  prension_tijeras?: string;

  @IsOptional()
  @IsString()
  observacion_escolar?: string;

  // 9. ÁREA DEL DESEMPEÑO - JUEGO
  @IsOptional()
  @IsString()
  juguetes_preferidos?: string;

  @IsOptional()
  @IsBoolean()
  tipo_juego_sensoriomotor?: boolean;

  @IsOptional()
  @IsBoolean()
  tipo_juego_simbolico?: boolean;

  @IsOptional()
  @IsBoolean()
  tipo_juego_otro?: boolean;

  @IsOptional()
  @IsString()
  lugar_preferido_jugar?: string;

  @IsOptional()
  @IsString()
  observacion_juego?: string;

  // 10. COMUNICACIÓN
  @IsOptional()
  @IsString()
  lenguaje?: string;

  // 11-13. CONCLUSIONES, SUGERENCIAS Y OBJETIVOS
  @IsOptional()
  @IsString()
  conclusiones?: string;

  @IsOptional()
  @IsString()
  sugerencias?: string;

  @IsOptional()
  @IsString()
  objetivos_iniciales?: string;
}