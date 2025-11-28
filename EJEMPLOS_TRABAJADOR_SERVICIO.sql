-- =============================================
-- EJEMPLOS DE USO: TRABAJADOR-SERVICIO
-- =============================================

USE crecemos_website;

-- ============================================
-- 1. ASIGNAR UN SERVICIO A UN TRABAJADOR
-- ============================================
-- Ejemplo: Asignar "Terapia de Lenguaje" (servicio_id=1) al trabajador con id=1
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones)
VALUES (1, 1, 'Especialista en terapia de lenguaje infantil');

-- ============================================
-- 2. ASIGNAR MÚLTIPLES SERVICIOS A UN TRABAJADOR
-- ============================================
-- Ejemplo: Un terapeuta puede dar varios servicios
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones)
VALUES
  (2, 1, 'Terapia de lenguaje'),
  (2, 2, 'Terapia ocupacional'),
  (2, 3, 'Terapia física');

-- ============================================
-- 3. VER TODOS LOS SERVICIOS DE UN TRABAJADOR
-- ============================================
SELECT
  t.id AS trabajador_id,
  CONCAT(t.nombres, ' ', t.apellidos) AS trabajador_nombre,
  s.nombre AS servicio_nombre,
  ts.fecha_asignacion,
  ts.activo,
  ts.observaciones
FROM trabajador_servicio ts
INNER JOIN trabajador_centro t ON ts.trabajador_id = t.id
INNER JOIN servicios s ON ts.servicio_id = s.id
WHERE ts.trabajador_id = 1
  AND ts.activo = true;

-- ============================================
-- 4. VER TODOS LOS TRABAJADORES DE UN SERVICIO
-- ============================================
SELECT
  s.nombre AS servicio_nombre,
  CONCAT(t.nombres, ' ', t.apellidos) AS trabajador_nombre,
  t.email,
  ts.fecha_asignacion
FROM trabajador_servicio ts
INNER JOIN trabajador_centro t ON ts.trabajador_id = t.id
INNER JOIN servicios s ON ts.servicio_id = s.id
WHERE ts.servicio_id = 1
  AND ts.activo = true
ORDER BY t.apellidos;

-- ============================================
-- 5. DESACTIVAR UN SERVICIO DE UN TRABAJADOR
-- ============================================
-- Cambiar activo a false (no eliminar, mantener historial)
UPDATE trabajador_servicio
SET activo = false
WHERE trabajador_id = 1 AND servicio_id = 1;

-- ============================================
-- 6. REACTIVAR UN SERVICIO
-- ============================================
UPDATE trabajador_servicio
SET activo = true
WHERE trabajador_id = 1 AND servicio_id = 1;

-- ============================================
-- 7. ELIMINAR COMPLETAMENTE UNA ASIGNACIÓN
-- ============================================
DELETE FROM trabajador_servicio
WHERE trabajador_id = 1 AND servicio_id = 1;

-- ============================================
-- 8. REPORTE: TRABAJADORES Y SUS SERVICIOS
-- ============================================
SELECT
  CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
  r.nombre AS rol,
  GROUP_CONCAT(s.nombre SEPARATOR ', ') AS servicios
FROM trabajador_centro t
LEFT JOIN rol r ON t.rol_id = r.id
LEFT JOIN trabajador_servicio ts ON t.id = ts.trabajador_id AND ts.activo = true
LEFT JOIN servicios s ON ts.servicio_id = s.id
WHERE t.estado = true
GROUP BY t.id, t.nombres, t.apellidos, r.nombre
ORDER BY t.apellidos;

-- ============================================
-- 9. CONTAR TRABAJADORES POR SERVICIO
-- ============================================
SELECT
  s.nombre AS servicio,
  COUNT(ts.id) AS cantidad_trabajadores
FROM servicios s
LEFT JOIN trabajador_servicio ts ON s.id = ts.servicio_id AND ts.activo = true
GROUP BY s.id, s.nombre
ORDER BY cantidad_trabajadores DESC;

-- ============================================
-- 10. TRABAJADORES SIN SERVICIOS ASIGNADOS
-- ============================================
SELECT
  t.id,
  CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
  t.email,
  r.nombre AS rol
FROM trabajador_centro t
LEFT JOIN rol r ON t.rol_id = r.id
LEFT JOIN trabajador_servicio ts ON t.id = ts.trabajador_id AND ts.activo = true
WHERE ts.id IS NULL
  AND t.estado = true
ORDER BY t.apellidos;
