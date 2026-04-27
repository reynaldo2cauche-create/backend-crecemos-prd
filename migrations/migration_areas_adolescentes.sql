-- ============================================================
-- MIGRACIÓN: Separar Área Adolescentes del Área Adultos
-- Rangos: Infantil 1-12 | Adolescentes 13-17 | Adultos 18+
-- Reglas de migración (pacientes 13-17 años):
--   servicio_id=7  (Psicoterapia Individual)    → 12 (Psicología Adolescentes)
--   servicio_id=10 (Terapia de Lenguaje Adultos) → 15 (TL Adolescentes)
-- Tablas afectadas: area_servicio, agrupador_servicios, servicios,
--   paciente, paciente_servicio, citas, historial_citas,
--   indicacion_terapeutica, nota_evolucion, reportes_evolucion,
--   solicitud_informe
-- ============================================================

START TRANSACTION;

-- ─── 1. RENOMBRAR ÁREAS ────────────────────────────────────
UPDATE area_servicio SET nombre = 'Área Adultos'      WHERE id = 2;
UPDATE area_servicio SET nombre = 'Área Adolescentes' WHERE id = 3;

UPDATE agrupador_servicios
  SET nombre_agrupador_servicio = 'Área Infantil'
  WHERE id_agrupador_servicio = 1;

INSERT IGNORE INTO agrupador_servicios
  (id_agrupador_servicio, nombre_agrupador_servicio, es_activo, fecha_crea, user_crea)
  VALUES (3, 'Área Adolescentes', 1, NOW(), 1);

-- ─── 2. REORGANIZAR SERVICIOS ──────────────────────────────
-- Orientación Vocacional (id=6): Infantil → Adolescentes
UPDATE servicios SET area_id = 3 WHERE id = 6;

-- ─── 3. NUEVOS SERVICIOS ───────────────────────────────────
-- especialidad: 5=Psicol.Adol+Adultos, 6=Psicol.Adolescentes
INSERT INTO servicios (area_id, nombre, activo, especialidad_id)
  VALUES (2, 'Orientación Vocacional',         1, 5);  -- id=16, Adultos
INSERT INTO servicios (area_id, nombre, activo, especialidad_id)
  VALUES (3, 'Evaluación para la Universidad', 1, 6);  -- id=17, Adolescentes
INSERT INTO servicios (area_id, nombre, activo, especialidad_id)
  VALUES (2, 'Evaluación para la Universidad', 1, 5);  -- id=18, Adultos

-- ─── 4. paciente.servicio_id ───────────────────────────────
UPDATE paciente
  SET servicio_id = 12
  WHERE servicio_id = 7
    AND TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE paciente
  SET servicio_id = 15
  WHERE servicio_id = 10
    AND TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 5. paciente_servicio — TODOS los registros ────────────
UPDATE paciente_servicio ps
  JOIN paciente p ON ps.paciente_id = p.id
  SET ps.servicio_id = 12
  WHERE ps.servicio_id = 7
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE paciente_servicio ps
  JOIN paciente p ON ps.paciente_id = p.id
  SET ps.servicio_id = 15
  WHERE ps.servicio_id = 10
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 6. citas — TODAS ──────────────────────────────────────
UPDATE citas c
  JOIN paciente p ON c.paciente_id = p.id
  SET c.servicio_id = 12
  WHERE c.servicio_id = 7
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE citas c
  JOIN paciente p ON c.paciente_id = p.id
  SET c.servicio_id = 15
  WHERE c.servicio_id = 10
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 7. historial_citas — TODAS ────────────────────────────
UPDATE historial_citas hc
  JOIN paciente p ON hc.paciente_id = p.id
  SET hc.servicio_id = 12
  WHERE hc.servicio_id = 7
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE historial_citas hc
  JOIN paciente p ON hc.paciente_id = p.id
  SET hc.servicio_id = 15
  WHERE hc.servicio_id = 10
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 8. indicacion_terapeutica — TODAS ─────────────────────
UPDATE indicacion_terapeutica it
  JOIN paciente p ON it.paciente_id = p.id
  SET it.servicio_id = 12
  WHERE it.servicio_id = 7
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE indicacion_terapeutica it
  JOIN paciente p ON it.paciente_id = p.id
  SET it.servicio_id = 15
  WHERE it.servicio_id = 10
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 9. nota_evolucion — TODAS ─────────────────────────────
UPDATE nota_evolucion ne
  JOIN paciente p ON ne.paciente_id = p.id
  SET ne.servicio_id = 12
  WHERE ne.servicio_id = 7
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE nota_evolucion ne
  JOIN paciente p ON ne.paciente_id = p.id
  SET ne.servicio_id = 15
  WHERE ne.servicio_id = 10
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 10. reportes_evolucion — TODAS ────────────────────────
UPDATE reportes_evolucion re
  JOIN paciente p ON re.paciente_id = p.id
  SET re.servicio_id = 12
  WHERE re.servicio_id = 7
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE reportes_evolucion re
  JOIN paciente p ON re.paciente_id = p.id
  SET re.servicio_id = 15
  WHERE re.servicio_id = 10
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 11. solicitud_informe — TODAS ─────────────────────────
-- Une por venta_servicio → paciente para obtener la edad
UPDATE solicitud_informe si
  JOIN venta_servicio vs ON si.venta_servicio_id = vs.id
  JOIN paciente p ON vs.paciente_id = p.id
  SET si.servicio_id = 12
  WHERE si.servicio_id = 7
    AND vs.paciente_id IS NOT NULL
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE solicitud_informe si
  JOIN venta_servicio vs ON si.venta_servicio_id = vs.id
  JOIN paciente p ON vs.paciente_id = p.id
  SET si.servicio_id = 15
  WHERE si.servicio_id = 10
    AND vs.paciente_id IS NOT NULL
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

-- ─── 12. servicio_tarifa — garantizar tarifas destino ─────
-- Antes de redirigir venta_servicio_detalle, nos aseguramos de
-- que existan registros en servicio_tarifa para los servicios
-- 12 (Psicología Adolescentes) y 15 (TL Adolescentes) con los
-- mismos motivo_cita que tienen los servicios 7 y 10.
-- El INSERT solo crea el registro si la combinación
-- (servicio_id, motivo_cita_id) todavía no existe.
INSERT INTO servicio_tarifa
  (servicio_id, motivo_cita_id, precio, precio_paquete, flg_activo, user_crea_id)
  SELECT 12, st.motivo_cita_id, st.precio, st.precio_paquete, st.flg_activo, st.user_crea_id
  FROM servicio_tarifa st
  WHERE st.servicio_id = 7
    AND NOT EXISTS (
      SELECT 1 FROM servicio_tarifa x
      WHERE x.servicio_id = 12 AND x.motivo_cita_id = st.motivo_cita_id
    );

INSERT INTO servicio_tarifa
  (servicio_id, motivo_cita_id, precio, precio_paquete, flg_activo, user_crea_id)
  SELECT 15, st.motivo_cita_id, st.precio, st.precio_paquete, st.flg_activo, st.user_crea_id
  FROM servicio_tarifa st
  WHERE st.servicio_id = 10
    AND NOT EXISTS (
      SELECT 1 FROM servicio_tarifa x
      WHERE x.servicio_id = 15 AND x.motivo_cita_id = st.motivo_cita_id
    );

-- ─── 13. venta_servicio_detalle — TODAS ────────────────────
-- venta_servicio_detalle no guarda servicio_id directamente;
-- el servicio se obtiene vía servicio_tarifa_id → servicio_tarifa.servicio_id.
-- Redirigimos al registro equivalente de servicio_tarifa para el
-- servicio adolescente, buscando la tarifa con el mismo motivo_cita.
-- motivo_cita_id (columna desnormalizada) no cambia: es el mismo motivo.
UPDATE venta_servicio_detalle vsd
  JOIN servicio_tarifa st_old ON vsd.servicio_tarifa_id = st_old.id
  JOIN servicio_tarifa st_new ON st_new.servicio_id = 12
                              AND st_new.motivo_cita_id = st_old.motivo_cita_id
  JOIN paciente p ON vsd.paciente_id = p.id
  SET vsd.servicio_tarifa_id = st_new.id
  WHERE st_old.servicio_id = 7
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

UPDATE venta_servicio_detalle vsd
  JOIN servicio_tarifa st_old ON vsd.servicio_tarifa_id = st_old.id
  JOIN servicio_tarifa st_new ON st_new.servicio_id = 15
                              AND st_new.motivo_cita_id = st_old.motivo_cita_id
  JOIN paciente p ON vsd.paciente_id = p.id
  SET vsd.servicio_tarifa_id = st_new.id
  WHERE st_old.servicio_id = 10
    AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) BETWEEN 13 AND 17;

COMMIT;
