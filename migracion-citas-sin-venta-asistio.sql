-- =====================================================
-- MIGRACIÓN: marcar "Asistió" en la TABLA seguimiento_asistencia
-- para las citas ANTIGUAS SIN venta.
--
-- "Asistió" real = seguimiento_asistencia con recepcion_estado_id = 7
--                  Y terapeuta_estado_id = 7  (ambos marco = 1).
-- (Así lo cuenta citas.service.ts: CASE WHEN sa.terapeuta_estado_id = 7
--  AND sa.recepcion_estado_id = 7 THEN asistió).
--
-- Alcance acordado:
--   • Solo citas SIN venta (venta_servicio_detalle_id IS NULL)
--   • Solo las que YA pasaron (fecha <= hoy)
--   • Cualquier motivo
--   • RESPETA estado 5 (cancelada), 6 (Sesión Dictada) y 8 (no-asistió)
--   • Solo citas activas (flg_activo = 1)
--   • Solo INSERTA seguimiento donde NO existe (nunca pisa marcas reales)
-- =====================================================

-- ──────────────────────────────────────────────────────────────────
-- PASO 0 (SOLO LECTURA) — foto actual de las SIN venta pasadas:
-- cuántas ya cuentan como asistió, cuántas no tienen seguimiento, por estado.
-- ──────────────────────────────────────────────────────────────────
SELECT
  c.estado_id,
  CASE
    WHEN sa.terapeuta_estado_id = 7 AND sa.recepcion_estado_id = 7 THEN 'YA asistió'
    WHEN sa.id IS NULL THEN 'SIN seguimiento'
    ELSE 'con seguimiento (otro estado)'
  END AS asistencia,
  COUNT(*) AS citas
FROM citas c
LEFT JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
GROUP BY c.estado_id, asistencia
ORDER BY c.estado_id, asistencia;

-- ──────────────────────────────────────────────────────────────────
-- PASO 1 — marcar Asistió en seguimiento_asistencia para las antiguas
-- SIN venta que NO tienen seguimiento (recepción + terapeuta = 7).
-- usuario_id NULL = migrado por sistema.
-- ──────────────────────────────────────────────────────────────────
INSERT INTO seguimiento_asistencia
  (cita_id, recepcion_marco, recepcion_estado_id, recepcion_fecha,
   terapeuta_marco, terapeuta_estado_id, terapeuta_fecha, created_at, updated_at)
SELECT c.id, 1, 7, NOW(), 1, 7, NOW(), NOW(), NOW()
FROM citas c
LEFT JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
  AND c.estado_id NOT IN (5, 6, 8)
  AND sa.id IS NULL;

-- ──────────────────────────────────────────────────────────────────
-- PASO 2 (OPCIONAL) — alinear citas.estado_id = 7 en las que estaban en 1,
-- para que la agenda muestre "Asistió" igual que la asistencia.
-- (No afecta el conteo de asistencia, que ya se arregla con el PASO 1.)
-- ──────────────────────────────────────────────────────────────────
UPDATE citas c
SET c.estado_id = 7
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
  AND c.estado_id = 1;

-- ──────────────────────────────────────────────────────────────────
-- PASO 3 (SOLO LECTURA) — verificación: ya no debería quedar "SIN seguimiento"
-- en las SIN venta no canceladas.
-- ──────────────────────────────────────────────────────────────────
SELECT
  CASE
    WHEN sa.terapeuta_estado_id = 7 AND sa.recepcion_estado_id = 7 THEN 'asistió'
    WHEN sa.id IS NULL THEN 'SIN seguimiento'
    ELSE 'otro'
  END AS asistencia,
  COUNT(*) AS citas
FROM citas c
LEFT JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
WHERE c.flg_activo = 1
  AND c.venta_servicio_detalle_id IS NULL
  AND c.fecha <= CURDATE()
  AND c.estado_id NOT IN (5, 6, 8)
GROUP BY asistencia;
