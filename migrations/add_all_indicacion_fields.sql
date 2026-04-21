-- Migración para agregar todos los campos de indicación terapéutica para todos los servicios
-- Fecha: 2026-03-05

-- ============================================
-- REFERENCIAS - Agregar campos internos
-- ============================================
ALTER TABLE indicacion_referencia
ADD COLUMN ref_inter_terapia_fisica tinyint(1) DEFAULT '0' AFTER ref_inter_terapia_pareja_fam,
ADD COLUMN ref_inter_terapia_respiratoria tinyint(1) DEFAULT '0' AFTER ref_inter_terapia_fisica;

-- ============================================
-- REFERENCIAS - Agregar campos externos
-- ============================================
ALTER TABLE indicacion_referencia
ADD COLUMN ref_exter_neurologia tinyint(1) DEFAULT '0' AFTER ref_exter_psiquiatria,
ADD COLUMN ref_exter_gastroenterologo tinyint(1) DEFAULT '0' AFTER ref_exter_neurologia,
ADD COLUMN ref_exter_nutricion tinyint(1) DEFAULT '0' AFTER ref_exter_gastroenterologo,
ADD COLUMN ref_exter_otorrinolaringologia tinyint(1) DEFAULT '0' AFTER ref_exter_nutricion,
ADD COLUMN ref_exter_geriatria tinyint(1) DEFAULT '0' AFTER ref_exter_otorrinolaringologia;

-- ============================================
-- RECOMENDACIONES - Terapia Ocupacional
-- ============================================
ALTER TABLE indicacion_recomendaciones
ADD COLUMN dedicar_15_20_min_actividades tinyint(1) DEFAULT '0' AFTER evitar_pantallas_excesivas,
ADD COLUMN establecer_rutina_estructurada tinyint(1) DEFAULT '0' AFTER dedicar_15_20_min_actividades,
ADD COLUMN favorecer_autonomia tinyint(1) DEFAULT '0' AFTER establecer_rutina_estructurada,
ADD COLUMN realizar_actividades_motricidad tinyint(1) DEFAULT '0' AFTER favorecer_autonomia;

-- ============================================
-- RECOMENDACIONES - Terapia Lenguaje Adultos
-- ============================================
ALTER TABLE indicacion_recomendaciones
ADD COLUMN evitar_corregirse_con_frustracion tinyint(1) DEFAULT '0' AFTER realizar_actividades_motricidad,
ADD COLUMN evitar_distracciones_practica tinyint(1) DEFAULT '0' AFTER evitar_corregirse_con_frustracion,
ADD COLUMN notificar_cambios_salud tinyint(1) DEFAULT '0' AFTER evitar_distracciones_practica,
ADD COLUMN realizar_ejercicios_ensenados tinyint(1) DEFAULT '0' AFTER notificar_cambios_salud,
ADD COLUMN involucrar_familiar_cuidador tinyint(1) DEFAULT '0' AFTER realizar_ejercicios_ensenados;

-- ============================================
-- RECOMENDACIONES - Terapia Deglutoria
-- ============================================
ALTER TABLE indicacion_recomendaciones
ADD COLUMN mantener_sentado_90_grados tinyint(1) DEFAULT '0' AFTER involucrar_familiar_cuidador,
ADD COLUMN evitar_comer_acostado tinyint(1) DEFAULT '0' AFTER mantener_sentado_90_grados,
ADD COLUMN ofrecer_porciones_pequenas tinyint(1) DEFAULT '0' AFTER evitar_comer_acostado,
ADD COLUMN verificar_trago_completo tinyint(1) DEFAULT '0' AFTER ofrecer_porciones_pequenas,
ADD COLUMN permitir_tiempo_entre_bocados tinyint(1) DEFAULT '0' AFTER verificar_trago_completo,
ADD COLUMN evitar_hablar_con_alimento tinyint(1) DEFAULT '0' AFTER permitir_tiempo_entre_bocados,
ADD COLUMN evitar_apresurar_alimentacion tinyint(1) DEFAULT '0' AFTER evitar_hablar_con_alimento,
ADD COLUMN dieta_tipo_pure tinyint(1) DEFAULT '0' AFTER evitar_apresurar_alimentacion,
ADD COLUMN usar_espesante_liquidos tinyint(1) DEFAULT '0' AFTER dieta_tipo_pure;

-- ============================================
-- RECOMENDACIONES - Psicología Infantil
-- ============================================
ALTER TABLE indicacion_recomendaciones
ADD COLUMN fomentar_ambiente_confianza tinyint(1) DEFAULT '0' AFTER usar_espesante_liquidos,
ADD COLUMN evitar_etiquetas_negativas tinyint(1) DEFAULT '0' AFTER fomentar_ambiente_confianza,
ADD COLUMN tener_paciencia_expectativas_realistas tinyint(1) DEFAULT '0' AFTER evitar_etiquetas_negativas;

-- ============================================
-- RECOMENDACIONES - Psicología Adolescentes
-- ============================================
ALTER TABLE indicacion_recomendaciones
ADD COLUMN evitar_confrontaciones_inmediatas tinyint(1) DEFAULT '0' AFTER tener_paciencia_expectativas_realistas,
ADD COLUMN respetar_espacio_terapeutico tinyint(1) DEFAULT '0' AFTER evitar_confrontaciones_inmediatas,
ADD COLUMN cumplir_tareas_familia tinyint(1) DEFAULT '0' AFTER respetar_espacio_terapeutico;

-- ============================================
-- RECOMENDACIONES - Terapia Pareja y Familiar
-- ============================================
ALTER TABLE indicacion_recomendaciones
ADD COLUMN ambos_asistir_sesiones tinyint(1) DEFAULT '0' AFTER cumplir_tareas_familia,
ADD COLUMN evitar_discutir_temas_sensibles tinyint(1) DEFAULT '0' AFTER ambos_asistir_sesiones,
ADD COLUMN actitud_apertura_respeto tinyint(1) DEFAULT '0' AFTER evitar_discutir_temas_sensibles,
ADD COLUMN comprometerse_sin_buscar_culpables tinyint(1) DEFAULT '0' AFTER actitud_apertura_respeto,
ADD COLUMN no_decisiones_impulsivas tinyint(1) DEFAULT '0' AFTER comprometerse_sin_buscar_culpables;

-- ============================================
-- RECOMENDACIONES - Psicoterapia
-- ============================================
ALTER TABLE indicacion_recomendaciones
ADD COLUMN ser_honesto_terapeuta tinyint(1) DEFAULT '0' AFTER no_decisiones_impulsivas,
ADD COLUMN evitar_juzgarse tinyint(1) DEFAULT '0' AFTER ser_honesto_terapeuta,
ADD COLUMN registrar_pensamientos_emociones tinyint(1) DEFAULT '0' AFTER evitar_juzgarse,
ADD COLUMN informar_eventos_importantes tinyint(1) DEFAULT '0' AFTER registrar_pensamientos_emociones;

-- ============================================
-- MATERIALES - Agregar campos nuevos
-- ============================================
ALTER TABLE indicacion_materiales
ADD COLUMN munecos tinyint(1) DEFAULT '0' AFTER plumon_indeleble;
