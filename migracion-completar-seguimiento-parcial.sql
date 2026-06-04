-- =====================================================
-- MIGRACIÓN: completar seguimientos PARCIALES (solo una parte marcó)
-- en citas ANTIGUAS SIN venta.
--
-- Regla: si marcó SOLO una parte (recepción o terapeuta), se copia ese
--        mismo estado al lado que falta. Así ambos quedan iguales.
--        (Si recepción marcó 7 -> terapeuta 7 -> cuenta como Asistió.)
--
-- Alcance:
--   • Solo citas SIN venta (venta_servicio_detalle_id IS NULL)
--   • Solo pasadas (fecha <= hoy), activas (flg_activo = 1)
--   • Solo seguimientos con EXACTAMENTE una parte marcada
--   • NO toca los casos "ambos marcaron distinto" (eso es otra cosa)
-- =====================================================

-- ──────────────────────────────────────────────────────────────────
-- PASO 0 (SOLO LECTURA) — ver los parciales y los "ambos distinto".
-- ──────────────────────────────────────────────────────────────────
SELECT
  CASE
    WHEN sa.recepcion_marco = 1 AND COALESCE(sa.terapeuta_marco,0) = 0 THEN 'solo recepcion marco'
    WHEN sa.terapeuta_marco = 1 AND COALESCE(sa.recepcion_marco,0) = 0 THEN 'solo terapeuta marco'
    WHEN sa.recepcion_marco = 1 AND sa.terapeuta_marco = 1
         AND sa.recepcion_estado_id <> sa.terapeuta_estado_id          THEN 'ambos marcaron DISTINTO'
    ELSE 'otro'
  END AS caso,
  COALESCE(sa.recepcion_estado_id, sa.terapeuta_estado_id) AS estado_marcado,
  COUNT(*) AS citas
FROM seguimiento_asistencia sa
INNER JOIN citas c ON c.id = sa.cita_id
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
  AND NOT (COALESCE(sa.recepcion_estado_id,0) = 7 AND COALESCE(sa.terapeuta_estado_id,0) = 7)
GROUP BY caso, estado_marcado
ORDER BY caso, estado_marcado;

-- ──────────────────────────────────────────────────────────────────
-- PASO 1 — solo recepción marcó: copiar su estado al terapeuta.
-- ──────────────────────────────────────────────────────────────────
UPDATE seguimiento_asistencia sa
INNER JOIN citas c ON c.id = sa.cita_id
SET sa.terapeuta_marco = 1,
    sa.terapeuta_estado_id = sa.recepcion_estado_id,
    sa.terapeuta_fecha = NOW()
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
  AND sa.recepcion_marco = 1
  AND sa.recepcion_estado_id IS NOT NULL
  AND COALESCE(sa.terapeuta_marco,0) = 0;

-- ──────────────────────────────────────────────────────────────────
-- PASO 2 — solo terapeuta marcó: copiar su estado a recepción.
-- ──────────────────────────────────────────────────────────────────
UPDATE seguimiento_asistencia sa
INNER JOIN citas c ON c.id = sa.cita_id
SET sa.recepcion_marco = 1,
    sa.recepcion_estado_id = sa.terapeuta_estado_id,
    sa.recepcion_fecha = NOW()
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
  AND sa.terapeuta_marco = 1
  AND sa.terapeuta_estado_id IS NOT NULL
  AND COALESCE(sa.recepcion_marco,0) = 0;

-- ──────────────────────────────────────────────────────────────────
-- PASO 3 (OPCIONAL) — alinear citas.estado_id con lo que quedó en
-- seguimiento (ambos 7 -> 7, ambos 6 -> 6). Solo cosmético para la agenda.
-- ──────────────────────────────────────────────────────────────────
UPDATE citas c
INNER JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
SET c.estado_id = sa.recepcion_estado_id
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
  AND sa.recepcion_marco = 1 AND sa.terapeuta_marco = 1
  AND sa.recepcion_estado_id = sa.terapeuta_estado_id
  AND c.estado_id <> sa.recepcion_estado_id
  AND c.estado_id NOT IN (5, 8);

-- ──────────────────────────────────────────────────────────────────
-- PASO 4 (SOLO LECTURA) — verificación: cuántas quedan asistió.
-- ──────────────────────────────────────────────────────────────────
SELECT
  CASE WHEN sa.recepcion_estado_id = 7 AND sa.terapeuta_estado_id = 7 THEN 'asistio'
       WHEN sa.recepcion_marco = 1 AND sa.terapeuta_marco = 1 THEN 'ambos marcados (otro estado)'
       ELSE 'aun parcial / sin marcar' END AS estado,
  COUNT(*) AS citas
FROM seguimiento_asistencia sa
INNER JOIN citas c ON c.id = sa.cita_id
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
GROUP BY estado;
