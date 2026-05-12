-- ============================================================
-- DEBUG 1: ¿Cuántos paciente_servicio activos hay?
-- ============================================================
SELECT COUNT(*) AS total_ps_activos FROM paciente_servicio WHERE activo = 1;

-- ============================================================
-- DEBUG 2: ¿Los paciente_servicio tienen paciente_id y servicio_id?
-- ============================================================
SELECT id, paciente_id, servicio_id, estado_paciente_id, activo
FROM paciente_servicio
LIMIT 10;

-- ============================================================
-- DEBUG 3: ¿Las citas tienen servicio_id? ¿Cuántas tienen NULL?
-- ============================================================
SELECT
  COUNT(*) AS total_citas,
  SUM(CASE WHEN servicio_id IS NULL THEN 1 ELSE 0 END) AS sin_servicio_id,
  SUM(CASE WHEN servicio_id IS NOT NULL THEN 1 ELSE 0 END) AS con_servicio_id
FROM citas
WHERE flg_activo = 1 AND estado_id NOT IN (5, 8);

-- ============================================================
-- DEBUG 4: ¿El join entre citas y paciente_servicio funciona?
--          (¿cuántos ps tienen al menos 1 cita que matchea?)
-- ============================================================
SELECT COUNT(DISTINCT ps.id) AS ps_con_citas
FROM paciente_servicio ps
JOIN citas c ON c.paciente_id = ps.paciente_id AND c.servicio_id = ps.servicio_id
WHERE ps.activo = 1
  AND c.flg_activo = 1
  AND c.estado_id NOT IN (5, 8);

-- ============================================================
-- DEBUG 5: Ver IDs reales de estado_paciente
-- ============================================================
SELECT id, nombre FROM estado_paciente ORDER BY id;

-- ============================================================
-- DEBUG 6: Ver IDs reales de estado_cita (para saber cuál es cancelada)
-- ============================================================
SELECT id, nombre FROM estado_cita ORDER BY id;

-- ============================================================
-- DEBUG 7: Ver 5 filas del resultado final ANTES de actualizar
-- ============================================================
SELECT
  ps.id,
  ps.paciente_id,
  ps.servicio_id,
  ps.estado_paciente_id AS estado_actual,
  uc.fecha AS ultima_fecha,
  uc.motivo_nombre,
  DATEDIFF(CURDATE(), uc.fecha) AS dias_desde_ultima,
  CASE
    WHEN uc.paciente_id IS NULL THEN '1-Nuevo'
    WHEN DATEDIFF(CURDATE(), uc.fecha) > 15 THEN '5-Inactivo'
    WHEN uc.motivo_nombre = 'Sesión de Terapia' THEN '4-Terapia'
    WHEN uc.motivo_nombre IN ('Evaluación','Reevaluación','Informe Verbal') THEN '3-Evaluacion'
    WHEN uc.motivo_nombre IN ('Entrevista Adolescentes o Adultos','Entrevista de Padres') THEN '2-Entrevista'
    ELSE '4-Terapia (otro)'
  END AS estado_calculado
FROM paciente_servicio ps
LEFT JOIN (
  SELECT c.paciente_id, c.servicio_id, c.fecha, mc.nombre AS motivo_nombre
  FROM citas c
  JOIN motivo_cita mc ON mc.id = c.motivo_id
  JOIN (
    SELECT MAX(c2.id) AS max_id
    FROM citas c2
    JOIN (
      SELECT paciente_id, servicio_id, MAX(fecha) AS max_fecha
      FROM citas
      WHERE flg_activo = 1 AND estado_id NOT IN (5, 8) AND servicio_id IS NOT NULL
      GROUP BY paciente_id, servicio_id
    ) ult ON c2.paciente_id = ult.paciente_id AND c2.servicio_id = ult.servicio_id AND c2.fecha = ult.max_fecha
    WHERE c2.flg_activo = 1 AND c2.estado_id NOT IN (5, 8)
    GROUP BY c2.paciente_id, c2.servicio_id
  ) ids ON c.id = ids.max_id
) uc ON uc.paciente_id = ps.paciente_id AND uc.servicio_id = ps.servicio_id
WHERE ps.activo = 1
LIMIT 10;
