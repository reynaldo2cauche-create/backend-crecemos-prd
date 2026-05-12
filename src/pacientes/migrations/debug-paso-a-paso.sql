-- CORRE ESTO LÍNEA POR LÍNEA y dime qué devuelve cada SELECT

-- 1. ¿Cuántos ps activos hay?
SELECT COUNT(*) AS ps_activos FROM paciente_servicio WHERE activo = 1;

-- 2. Crear la temp table con lógica simplificada (MAX id por paciente+servicio)
DROP TEMPORARY TABLE IF EXISTS tmp_uc;

CREATE TEMPORARY TABLE tmp_uc AS
SELECT c.paciente_id, c.servicio_id, c.fecha, mc.nombre AS motivo_nombre
FROM citas c
JOIN motivo_cita mc ON mc.id = c.motivo_id
JOIN (
  SELECT paciente_id, servicio_id, MAX(id) AS max_id
  FROM citas
  WHERE flg_activo = 1 AND estado_id != 5 AND servicio_id IS NOT NULL
  GROUP BY paciente_id, servicio_id
) latest ON c.id = latest.max_id;

-- 3. ¿Cuántas filas tiene la temp table?
SELECT COUNT(*) AS filas_tmp_uc FROM tmp_uc;

-- 4. ¿Qué motivos salieron?
SELECT motivo_nombre, COUNT(*) FROM tmp_uc GROUP BY motivo_nombre;

-- 5. ¿El join con paciente_servicio funciona?
SELECT COUNT(*) AS ps_con_match
FROM paciente_servicio ps
JOIN tmp_uc uc ON uc.paciente_id = ps.paciente_id AND uc.servicio_id = ps.servicio_id
WHERE ps.activo = 1;
