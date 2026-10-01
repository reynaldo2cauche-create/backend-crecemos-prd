-- =====================================================
-- MIGRACIÓN: convertir tablas de notas a utf8mb4
--
-- Problema: al guardar texto con caracteres UTF-8 multibyte (→ – “ ” … o emojis)
-- MySQL lanza "Incorrect string value: '\xE2\x86\x92'..." porque la columna está
-- en latin1. Convertir a utf8mb4 (superconjunto) resuelve el guardado. Es una
-- operación NO destructiva: no se pierde el texto existente.
--
-- Corre primero diagnostico-charset.sql para confirmar qué tablas están en latin1
-- y agrega aquí las que falten.
-- =====================================================

-- Notas de evolución (entrevista, sesión de evaluación, sesión de terapias, objetivos, observaciones)
ALTER TABLE nota_evolucion CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ficha de seguimiento escolar (observaciones y textos libres de la docente)
ALTER TABLE ficha_seguimiento_escolar CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Si el diagnóstico muestra otras tablas de notas en latin1, agrégalas igual, por ej.:
-- ALTER TABLE seguimiento_asistencia    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE indicacion_recomendaciones CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE solicitud_informe          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
