-- Migración: Sincronizar estado global del paciente basado en estados por servicio
-- Lógica de prioridad: Terapia(4) > Evaluacion(3) > Entrevista(2) > Nuevo(1)
-- Si todos los servicios activos son Inactivo(5) → estado global = 5
-- Si no hay servicios activos con estado → no se toca el paciente

UPDATE paciente p
INNER JOIN (
  SELECT
    ps.paciente_id,
    CASE
      -- Si todos los servicios activos tienen estado Inactivo(5) → global = 5
      WHEN SUM(CASE WHEN ps.estado_paciente_id != 5 THEN 1 ELSE 0 END) = 0
        THEN 5
      -- Terapia(4) tiene prioridad más alta
      WHEN SUM(CASE WHEN ps.estado_paciente_id = 4 THEN 1 ELSE 0 END) > 0
        THEN 4
      -- Luego Evaluacion(3)
      WHEN SUM(CASE WHEN ps.estado_paciente_id = 3 THEN 1 ELSE 0 END) > 0
        THEN 3
      -- Luego Entrevista(2)
      WHEN SUM(CASE WHEN ps.estado_paciente_id = 2 THEN 1 ELSE 0 END) > 0
        THEN 2
      -- Por defecto Nuevo(1)
      ELSE 1
    END AS nuevo_estado_id
  FROM paciente_servicio ps
  WHERE ps.activo = 1
    AND ps.estado_paciente_id IS NOT NULL
  GROUP BY ps.paciente_id
) calc ON p.id = calc.paciente_id
SET p.estado_paciente_id = calc.nuevo_estado_id
WHERE p.activo = 1;
