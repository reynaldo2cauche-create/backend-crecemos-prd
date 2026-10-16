-- =====================================================
-- FIX: columnas 'otros' de indicación terapéutica a TEXT
--
-- Error en prod: "Data too long for column 'otros'": los campos de texto libre
-- 'otros' en materiales y recomendaciones eran VARCHAR(255) y se escribió más.
-- Se pasan a TEXT (sin límite práctico).
-- No destructivo: TEXT contiene lo que ya había.
-- =====================================================

ALTER TABLE indicacion_materiales
  MODIFY otros TEXT NULL;

ALTER TABLE indicacion_recomendaciones
  MODIFY otros TEXT NULL;
