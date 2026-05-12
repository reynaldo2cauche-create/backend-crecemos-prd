-- ============================================================
-- PASO 1: Última cita por paciente+servicio
-- ============================================================
DROP TEMPORARY TABLE IF EXISTS tmp_ultima_cita;

CREATE TEMPORARY TABLE tmp_ultima_cita AS
SELECT
  c.paciente_id,
  c.servicio_id,
  c.fecha,
  mc.nombre AS motivo_nombre
FROM citas c
JOIN motivo_cita mc ON mc.id = c.motivo_id
JOIN (
  SELECT MAX(c2.id) AS max_id
  FROM citas c2
  JOIN (
    SELECT paciente_id, servicio_id, MAX(fecha) AS max_fecha
    FROM citas
    WHERE flg_activo = 1
      AND estado_id != 5
      AND servicio_id IS NOT NULL
    GROUP BY paciente_id, servicio_id
  ) ult ON c2.paciente_id = ult.paciente_id
       AND c2.servicio_id = ult.servicio_id
       AND c2.fecha = ult.max_fecha
  WHERE c2.flg_activo = 1 AND c2.estado_id != 5
  GROUP BY c2.paciente_id, c2.servicio_id
) ids ON c.id = ids.max_id;


-- ============================================================
-- PASO 2: Calcular nuevo estado por cada paciente_servicio
-- ============================================================
DROP TEMPORARY TABLE IF EXISTS tmp_nuevos_estados;

CREATE TEMPORARY TABLE tmp_nuevos_estados AS
SELECT
  ps.id AS ps_id,
  CASE
    WHEN uc.paciente_id IS NULL
      THEN 1  -- Nuevo: sin ninguna cita

    WHEN DATEDIFF(CURDATE(), uc.fecha) > 15
      THEN 5  -- Inactivo: última cita hace más de 15 días

    WHEN uc.motivo_nombre = 'Sesión de Terapia'
      THEN 4  -- Terapia

    WHEN uc.motivo_nombre IN ('Evaluación', 'Reevaluación', 'Informe Verbal')
      THEN 3  -- Evaluacion

    WHEN uc.motivo_nombre IN ('Entrevista Adolescentes o Adultos', 'Entrevista de Padres')
      THEN 2  -- Entrevista

    ELSE 4    -- Reunión Clínica u otro → Terapia
  END AS nuevo_estado
FROM paciente_servicio ps
LEFT JOIN tmp_ultima_cita uc
  ON uc.paciente_id = ps.paciente_id
 AND uc.servicio_id = ps.servicio_id
WHERE ps.activo = 1;


-- ============================================================
-- PASO 3: Aplicar los estados a paciente_servicio
-- ============================================================
UPDATE paciente_servicio ps
JOIN tmp_nuevos_estados ne ON ne.ps_id = ps.id
SET ps.estado_paciente_id = ne.nuevo_estado
WHERE ps.activo = 1;


-- ============================================================
-- PASO 4: Sincronizar estado global del paciente
-- ============================================================
UPDATE paciente p
JOIN (
  SELECT
    ps.paciente_id,
    CASE
      WHEN SUM(CASE WHEN ps.estado_paciente_id != 5 THEN 1 ELSE 0 END) = 0 THEN 5
      WHEN SUM(CASE WHEN ps.estado_paciente_id = 4 THEN 1 ELSE 0 END) > 0  THEN 4
      WHEN SUM(CASE WHEN ps.estado_paciente_id = 3 THEN 1 ELSE 0 END) > 0  THEN 3
      WHEN SUM(CASE WHEN ps.estado_paciente_id = 2 THEN 1 ELSE 0 END) > 0  THEN 2
      ELSE 1
    END AS nuevo_estado_id
  FROM paciente_servicio ps
  WHERE ps.activo = 1 AND ps.estado_paciente_id IS NOT NULL
  GROUP BY ps.paciente_id
) calc ON p.id = calc.paciente_id
SET p.estado_paciente_id = calc.nuevo_estado_id
WHERE p.activo = 1;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT ep.nombre AS estado, COUNT(*) AS total
FROM paciente_servicio ps
JOIN estado_paciente ep ON ep.id = ps.estado_paciente_id
WHERE ps.activo = 1
GROUP BY ep.id, ep.nombre
ORDER BY ep.id;
