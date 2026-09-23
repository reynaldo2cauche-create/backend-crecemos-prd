-- ============================================================================
-- BACKFILL de bloqueos de agenda para data YA registrada antes de esta feature.
-- Crea los bloqueos que hoy se generan automáticamente, para lo viejo:
--   1) Faltas de TERAPEUTAS (rol_id = 4)  -> bloqueo PUNTUAL, todo el día, por día.
--   2) Solicitudes APROBADAS              -> bloqueo PUNTUAL por día (por horas si tiene tramo).
-- Idempotente: solo inserta si esa falta/solicitud aún no tiene bloqueos (NOT EXISTS).
-- Requisito: la columna bloqueo_horarios.falta_id debe existir
--            (correr antes migracion-bloqueo-falta.sql).
-- ============================================================================

SET @tipo_puntual := (SELECT id FROM tipo_bloqueo WHERE codigo = 'PUNTUAL' LIMIT 1);

-- ------------------------------------------------------------------
-- 1) FALTAS de terapeutas
-- ------------------------------------------------------------------
INSERT INTO bloqueo_horarios
  (trabajador_id, tipo_bloqueo_id, fecha_inicio, fecha_fin, dia_semana,
   todo_el_dia, hora_inicio, hora_fin, motivo, falta_id, activo,
   user_id_crea, created_at, updated_at)
WITH RECURSIVE dias_falta AS (
  SELECT
    f.id            AS falta_id,
    f.trabajador_id AS trabajador_id,
    f.fecha_inicio  AS d,
    f.fecha_fin     AS fin,
    tf.nombre       AS tipo_nombre,
    f.observaciones AS obs,
    f.user_id_crea  AS creador
  FROM faltas f
  JOIN trabajador_centro tc ON tc.id = f.trabajador_id
  LEFT JOIN tipo_falta tf   ON tf.id = f.tipo_falta_id
  WHERE tc.rol_id = 4
    AND NOT EXISTS (SELECT 1 FROM bloqueo_horarios b WHERE b.falta_id = f.id)
  UNION ALL
  SELECT falta_id, trabajador_id, DATE_ADD(d, INTERVAL 1 DAY), fin, tipo_nombre, obs, creador
  FROM dias_falta
  WHERE d < fin
)
SELECT
  trabajador_id, @tipo_puntual, d, d, NULL,
  1, NULL, NULL,
  CONCAT(COALESCE(tipo_nombre, 'Falta'), ' (falta #', falta_id, ')',
         IF(obs IS NOT NULL AND obs <> '', CONCAT(' — ', obs), '')),
  falta_id, 1,
  creador, NOW(), NOW()
FROM dias_falta;

-- ------------------------------------------------------------------
-- 2) SOLICITUDES aprobadas
-- ------------------------------------------------------------------
INSERT INTO bloqueo_horarios
  (trabajador_id, tipo_bloqueo_id, fecha_inicio, fecha_fin, dia_semana,
   todo_el_dia, hora_inicio, hora_fin, motivo, solicitud_id, activo,
   user_id_crea, created_at, updated_at)
WITH RECURSIVE dias_sol AS (
  SELECT
    s.id            AS sol_id,
    s.trabajador_id AS trabajador_id,
    s.fecha_inicio  AS d,
    COALESCE(s.fecha_fin, s.fecha_inicio) AS fin,
    s.tipo          AS tipo,
    s.motivo        AS motivo,
    s.hora_desde    AS hora_desde,
    s.hora_hasta    AS hora_hasta,
    s.revisor_id    AS revisor
  FROM solicitud s
  WHERE s.estado = 'aprobado'
    AND NOT EXISTS (SELECT 1 FROM bloqueo_horarios b WHERE b.solicitud_id = s.id)
  UNION ALL
  SELECT sol_id, trabajador_id, DATE_ADD(d, INTERVAL 1 DAY), fin, tipo, motivo, hora_desde, hora_hasta, revisor
  FROM dias_sol
  WHERE d < fin
)
SELECT
  trabajador_id, @tipo_puntual, d, d, NULL,
  IF(hora_desde IS NOT NULL AND hora_hasta IS NOT NULL, 0, 1) AS todo_el_dia,
  hora_desde, hora_hasta,
  CONCAT(
    CASE tipo
      WHEN 'permiso_personal'     THEN 'Permiso personal'
      WHEN 'permiso_medico'       THEN 'Permiso médico'
      WHEN 'permiso_capacitacion' THEN 'Permiso por capacitación'
      WHEN 'permiso_horas'        THEN 'Permiso por horas'
      WHEN 'vacaciones'           THEN 'Vacaciones'
      WHEN 'otro'                 THEN 'Otro'
      ELSE tipo
    END,
    ' aprobado',
    IF(motivo IS NOT NULL AND motivo <> '', CONCAT(' — ', motivo), ''),
    ' (solicitud #', sol_id, ')'),
  sol_id, 1,
  revisor, NOW(), NOW()
FROM dias_sol;
