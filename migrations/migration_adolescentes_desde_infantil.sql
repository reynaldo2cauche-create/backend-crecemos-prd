-- ============================================================
-- MIGRACIÓN COMPLEMENTARIA: Adolescentes en servicios Infantil
-- Fecha: 2026-04-27
-- Rangos: Adolescentes = 13-17 años
--
-- Mapeos aplicados:
--   servicio_id=4  (Psicología Infantil)               → 12  (Psicología Adolescentes)
--   servicio_id=1  (Terapia de Lenguaje Infantil)      → 15  (Terapia de Lenguaje Adolescentes)
--   servicio_id=5  (Eval. Psicológica para Colegio)    → 19* (nuevo, Área Adolescentes)
--   * id generado automáticamente, capturado con LAST_INSERT_ID()
--
-- Sin equivalente — NO se migran:
--   servicio_id=2  (Terapia Ocupacional)
--   servicio_id=3  (Terapia de Aprendizaje)
--   servicio_id=11 (Estimulación del Lenguaje)
--
-- Tablas afectadas: servicios, servicio_tarifa,
--   paciente, paciente_servicio, citas, historial_citas,
--   indicacion_terapeutica, nota_evolucion, reportes_evolucion,
--   solicitud_informe, venta_servicio_detalle
-- ============================================================

START TRANSACTION;

-- ─── 1. NUEVO SERVICIO ──────────────────────────────────────
-- Evaluación Psicológica para Colegio — Área Adolescentes
-- especialidad_id=6 (Psicología Adolescentes)
INSERT INTO servicios (area_id, nombre, activo, especialidad_id)
  SELECT 3, 'Evaluación Psicológica para Colegio', 1, 6
  WHERE NOT EXISTS (
    SELECT 1 FROM servicios WHERE area_id = 3 AND nombre = 'Evaluación Psicológica para Colegio'
  );
SET @id_eval_adol = (SELECT id FROM servicios WHERE area_id = 3 AND nombre = 'Evaluación Psicológica para Colegio' LIMIT 1);

-- ─── 2. servicio_tarifa — garantizar tarifas destino ────────
-- Copia las tarifas del servicio origen al servicio destino
-- solo si aún no existe la combinación (servicio_id, motivo_cita_id).

-- 4 → 12 (Psicología Infantil → Psicología Adolescentes)
INSERT INTO servicio_tarifa
  (servicio_id, motivo_cita_id, precio, precio_paquete, flg_activo, user_crea_id)
  SELECT 12, st.motivo_cita_id, st.precio, st.precio_paquete, st.flg_activo, st.user_crea_id
  FROM servicio_tarifa st
  WHERE st.servicio_id = 4
    AND NOT EXISTS (
      SELECT 1 FROM servicio_tarifa x
      WHERE x.servicio_id = 12 AND x.motivo_cita_id = st.motivo_cita_id
    );

-- 1 → 15 (TL Infantil → TL Adolescentes)
INSERT INTO servicio_tarifa
  (servicio_id, motivo_cita_id, precio, precio_paquete, flg_activo, user_crea_id)
  SELECT 15, st.motivo_cita_id, st.precio, st.precio_paquete, st.flg_activo, st.user_crea_id
  FROM servicio_tarifa st
  WHERE st.servicio_id = 1
    AND NOT EXISTS (
      SELECT 1 FROM servicio_tarifa x
      WHERE x.servicio_id = 15 AND x.motivo_cita_id = st.motivo_cita_id
    );

-- 5 → nuevo (Eval. Psicológica Colegio → versión Adolescentes)
INSERT INTO servicio_tarifa
  (servicio_id, motivo_cita_id, precio, precio_paquete, flg_activo, user_crea_id)
  SELECT @id_eval_adol, st.motivo_cita_id, st.precio, st.precio_paquete, st.flg_activo, st.user_crea_id
  FROM servicio_tarifa st
  WHERE st.servicio_id = 5
    AND NOT EXISTS (
      SELECT 1 FROM servicio_tarifa x
      WHERE x.servicio_id = @id_eval_adol AND x.motivo_cita_id = st.motivo_cita_id
    );

-- ─── 3. paciente.servicio_id ────────────────────────────────
UPDATE paciente
  SET servicio_id = 12
  WHERE servicio_id = 4
    AND TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE paciente
  SET servicio_id = 15
  WHERE servicio_id = 1
    AND TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE paciente
  SET servicio_id = @id_eval_adol
  WHERE servicio_id = 5
    AND TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 4. paciente_servicio — TODOS los registros ─────────────
UPDATE paciente_servicio ps
  JOIN paciente p ON ps.paciente_id = p.id
  SET ps.servicio_id = 12
  WHERE ps.servicio_id = 4
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE paciente_servicio ps
  JOIN paciente p ON ps.paciente_id = p.id
  SET ps.servicio_id = 15
  WHERE ps.servicio_id = 1
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE paciente_servicio ps
  JOIN paciente p ON ps.paciente_id = p.id
  SET ps.servicio_id = @id_eval_adol
  WHERE ps.servicio_id = 5
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 5. citas — TODAS ───────────────────────────────────────
UPDATE citas c
  JOIN paciente p ON c.paciente_id = p.id
  SET c.servicio_id = 12
  WHERE c.servicio_id = 4
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE citas c
  JOIN paciente p ON c.paciente_id = p.id
  SET c.servicio_id = 15
  WHERE c.servicio_id = 1
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE citas c
  JOIN paciente p ON c.paciente_id = p.id
  SET c.servicio_id = @id_eval_adol
  WHERE c.servicio_id = 5
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 6. historial_citas — TODAS ─────────────────────────────
UPDATE historial_citas hc
  JOIN paciente p ON hc.paciente_id = p.id
  SET hc.servicio_id = 12
  WHERE hc.servicio_id = 4
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE historial_citas hc
  JOIN paciente p ON hc.paciente_id = p.id
  SET hc.servicio_id = 15
  WHERE hc.servicio_id = 1
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE historial_citas hc
  JOIN paciente p ON hc.paciente_id = p.id
  SET hc.servicio_id = @id_eval_adol
  WHERE hc.servicio_id = 5
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 7. indicacion_terapeutica — TODAS ──────────────────────
UPDATE indicacion_terapeutica it
  JOIN paciente p ON it.paciente_id = p.id
  SET it.servicio_id = 12
  WHERE it.servicio_id = 4
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE indicacion_terapeutica it
  JOIN paciente p ON it.paciente_id = p.id
  SET it.servicio_id = 15
  WHERE it.servicio_id = 1
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE indicacion_terapeutica it
  JOIN paciente p ON it.paciente_id = p.id
  SET it.servicio_id = @id_eval_adol
  WHERE it.servicio_id = 5
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 8. nota_evolucion — TODAS ──────────────────────────────
UPDATE nota_evolucion ne
  JOIN paciente p ON ne.paciente_id = p.id
  SET ne.servicio_id = 12
  WHERE ne.servicio_id = 4
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE nota_evolucion ne
  JOIN paciente p ON ne.paciente_id = p.id
  SET ne.servicio_id = 15
  WHERE ne.servicio_id = 1
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE nota_evolucion ne
  JOIN paciente p ON ne.paciente_id = p.id
  SET ne.servicio_id = @id_eval_adol
  WHERE ne.servicio_id = 5
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 9. reportes_evolucion — TODAS ──────────────────────────
UPDATE reportes_evolucion re
  JOIN paciente p ON re.paciente_id = p.id
  SET re.servicio_id = 12
  WHERE re.servicio_id = 4
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE reportes_evolucion re
  JOIN paciente p ON re.paciente_id = p.id
  SET re.servicio_id = 15
  WHERE re.servicio_id = 1
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE reportes_evolucion re
  JOIN paciente p ON re.paciente_id = p.id
  SET re.servicio_id = @id_eval_adol
  WHERE re.servicio_id = 5
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 10. solicitud_informe — TODAS ──────────────────────────
UPDATE solicitud_informe si
  JOIN venta_servicio vs ON si.venta_servicio_id = vs.id
  JOIN paciente p ON vs.paciente_id = p.id
  SET si.servicio_id = 12
  WHERE si.servicio_id = 4
    AND vs.paciente_id IS NOT NULL
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE solicitud_informe si
  JOIN venta_servicio vs ON si.venta_servicio_id = vs.id
  JOIN paciente p ON vs.paciente_id = p.id
  SET si.servicio_id = 15
  WHERE si.servicio_id = 1
    AND vs.paciente_id IS NOT NULL
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE solicitud_informe si
  JOIN venta_servicio vs ON si.venta_servicio_id = vs.id
  JOIN paciente p ON vs.paciente_id = p.id
  SET si.servicio_id = @id_eval_adol
  WHERE si.servicio_id = 5
    AND vs.paciente_id IS NOT NULL
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 11. venta_servicio_detalle — TODAS ─────────────────────
-- El servicio se obtiene vía servicio_tarifa_id → servicio_tarifa.servicio_id.

-- 4 → 12
UPDATE venta_servicio_detalle vsd
  JOIN servicio_tarifa st_old ON vsd.servicio_tarifa_id = st_old.id
  JOIN servicio_tarifa st_new ON st_new.servicio_id = 12
                              AND st_new.motivo_cita_id = st_old.motivo_cita_id
  JOIN paciente p ON vsd.paciente_id = p.id
  SET vsd.servicio_tarifa_id = st_new.id
  WHERE st_old.servicio_id = 4
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- 1 → 15
UPDATE venta_servicio_detalle vsd
  JOIN servicio_tarifa st_old ON vsd.servicio_tarifa_id = st_old.id
  JOIN servicio_tarifa st_new ON st_new.servicio_id = 15
                              AND st_new.motivo_cita_id = st_old.motivo_cita_id
  JOIN paciente p ON vsd.paciente_id = p.id
  SET vsd.servicio_tarifa_id = st_new.id
  WHERE st_old.servicio_id = 1
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- 5 → nuevo (Eval. Psicológica Colegio Adolescentes)
UPDATE venta_servicio_detalle vsd
  JOIN servicio_tarifa st_old ON vsd.servicio_tarifa_id = st_old.id
  JOIN servicio_tarifa st_new ON st_new.servicio_id = @id_eval_adol
                              AND st_new.motivo_cita_id = st_old.motivo_cita_id
  JOIN paciente p ON vsd.paciente_id = p.id
  SET vsd.servicio_tarifa_id = st_new.id
  WHERE st_old.servicio_id = 5
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 12. venta_servicio_detalle — corregir descripcion_linea ─
-- "Psicoterapia Individual" → "Psicología Adolescentes"  (primera migración 7→12)
UPDATE venta_servicio_detalle vsd
  JOIN servicio_tarifa st ON vsd.servicio_tarifa_id = st.id
  JOIN paciente p ON vsd.paciente_id = p.id
  SET vsd.descripcion_linea = REPLACE(vsd.descripcion_linea, 'Psicoterapia Individual', 'Psicología Adolescentes')
  WHERE st.servicio_id = 12
    AND vsd.descripcion_linea LIKE '%Psicoterapia Individual%'
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- "Psicología Infantil" → "Psicología Adolescentes"  (esta migración 4→12)
UPDATE venta_servicio_detalle vsd
  JOIN servicio_tarifa st ON vsd.servicio_tarifa_id = st.id
  JOIN paciente p ON vsd.paciente_id = p.id
  SET vsd.descripcion_linea = REPLACE(vsd.descripcion_linea, 'Psicología Infantil', 'Psicología Adolescentes')
  WHERE st.servicio_id = 12
    AND vsd.descripcion_linea LIKE '%Psicología Infantil%'
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

COMMIT;
