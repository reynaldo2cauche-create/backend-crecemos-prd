-- =====================================================
-- FIX: columnas de observación de la ficha a TEXT
--
-- Error en prod: "Data too long for column 'cf1_obs'": las observaciones eran
-- VARCHAR(255) y la docente escribió más. Se pasan a TEXT (sin límite práctico).
-- No destructivo: TEXT contiene lo que ya había.
-- =====================================================

ALTER TABLE ficha_seguimiento_escolar
  MODIFY periodo_observacion TEXT NULL, MODIFY docente_nombre TEXT NULL,
  MODIFY aula TEXT NULL, MODIFY institucion_educativa TEXT NULL,
  MODIFY cf1_obs TEXT NULL, MODIFY cf2_obs TEXT NULL, MODIFY cf3_obs TEXT NULL,
  MODIFY cf4_obs TEXT NULL, MODIFY cf5_obs TEXT NULL, MODIFY cf6_obs TEXT NULL,
  MODIFY cl1_obs TEXT NULL, MODIFY cl2_obs TEXT NULL, MODIFY cl3_obs TEXT NULL,
  MODIFY cl4_obs TEXT NULL, MODIFY cl5_obs TEXT NULL,
  MODIFY ve1_obs TEXT NULL, MODIFY ve2_obs TEXT NULL, MODIFY ve3_obs TEXT NULL,
  MODIFY ve4_obs TEXT NULL, MODIFY ve5_obs TEXT NULL,
  MODIFY is1_obs TEXT NULL, MODIFY is2_obs TEXT NULL, MODIFY is3_obs TEXT NULL,
  MODIFY is4_obs TEXT NULL, MODIFY is5_obs TEXT NULL, MODIFY is6_obs TEXT NULL,
  MODIFY ji1_obs TEXT NULL, MODIFY ji2_obs TEXT NULL, MODIFY ji3_obs TEXT NULL,
  MODIFY ji4_obs TEXT NULL, MODIFY ji5_obs TEXT NULL,
  MODIFY usa_otro TEXT NULL, MODIFY est_otro TEXT NULL;
