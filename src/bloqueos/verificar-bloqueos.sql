-- ============================================
-- SCRIPT DE VERIFICACIÓN: Sistema de Bloqueos
-- ============================================

-- 1️⃣ Verificar que las tablas existen
SELECT
  '1. VERIFICAR TABLAS' AS '═══════════════════════════════════════';

SHOW TABLES LIKE '%bloqueo%';

-- 2️⃣ Verificar tipos de bloqueo (debe haber 2 registros)
SELECT
  '2. TIPOS DE BLOQUEO (debe mostrar 2 registros)' AS '═══════════════════════════════════════';

SELECT * FROM tipo_bloqueo;

-- 3️⃣ Ver estructura de bloqueo_horarios
SELECT
  '3. ESTRUCTURA DE BLOQUEO_HORARIOS' AS '═══════════════════════════════════════';

DESCRIBE bloqueo_horarios;

-- 4️⃣ Contar bloqueos activos
SELECT
  '4. CANTIDAD DE BLOQUEOS ACTIVOS' AS '═══════════════════════════════════════';

SELECT
  COUNT(*) as total_bloqueos_activos,
  SUM(CASE WHEN tipo_bloqueo_id = 1 THEN 1 ELSE 0 END) as puntuales,
  SUM(CASE WHEN tipo_bloqueo_id = 2 THEN 1 ELSE 0 END) as recurrentes
FROM bloqueo_horarios
WHERE activo = TRUE;

-- 5️⃣ Ver todos los bloqueos con información completa
SELECT
  '5. LISTA DE BLOQUEOS ACTIVOS' AS '═══════════════════════════════════════';

SELECT
  b.id,
  CONCAT(t.nombres, ' ', t.apellidos) AS terapeuta,
  e.nombre AS especialidad,
  tb.nombre AS tipo_bloqueo,
  DATE_FORMAT(b.fecha_inicio, '%d/%m/%Y') AS desde,
  DATE_FORMAT(b.fecha_fin, '%d/%m/%Y') AS hasta,
  CASE b.dia_semana
    WHEN 0 THEN 'Domingos'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábados'
    ELSE '-'
  END AS dia,
  CASE
    WHEN b.todo_el_dia = TRUE THEN 'Todo el día'
    ELSE CONCAT(TIME_FORMAT(b.hora_inicio, '%H:%i'), ' - ', TIME_FORMAT(b.hora_fin, '%H:%i'))
  END AS horario,
  b.motivo,
  CONCAT(u.nombres, ' ', u.apellidos) AS creado_por,
  DATE_FORMAT(b.created_at, '%d/%m/%Y %H:%i') AS fecha_creacion
FROM bloqueo_horarios b
INNER JOIN trabajador_centro t ON b.trabajador_id = t.id
INNER JOIN tipo_bloqueo tb ON b.tipo_bloqueo_id = tb.id
LEFT JOIN especialidad e ON t.especialidad_id = e.id
LEFT JOIN trabajador_centro u ON b.user_id_crea = u.id
WHERE b.activo = TRUE
  AND b.fecha_fin >= CURDATE()
ORDER BY t.apellidos, t.nombres, b.fecha_inicio;

-- 6️⃣ Verificar bloqueos por terapeuta
SELECT
  '6. BLOQUEOS POR TERAPEUTA' AS '═══════════════════════════════════════';

SELECT
  t.id,
  CONCAT(t.nombres, ' ', t.apellidos) AS terapeuta,
  e.nombre AS especialidad,
  COUNT(b.id) AS total_bloqueos_activos
FROM trabajador_centro t
LEFT JOIN especialidad e ON t.especialidad_id = e.id
LEFT JOIN bloqueo_horarios b ON t.id = b.trabajador_id AND b.activo = TRUE AND b.fecha_fin >= CURDATE()
WHERE t.estado = TRUE
GROUP BY t.id, t.nombres, t.apellidos, e.nombre
HAVING total_bloqueos_activos > 0
ORDER BY total_bloqueos_activos DESC;

-- 7️⃣ Verificar si un horario específico está bloqueado
-- EJEMPLO: Verificar si trabajador_id=1 está bloqueado el 2026-03-15 a las 09:00
SELECT
  '7. EJEMPLO DE VERIFICACIÓN DE HORARIO' AS '═══════════════════════════════════════';

SELECT
  '🔍 Verificando si trabajador_id=1 está bloqueado el 2026-03-15 a las 09:00' AS info;

-- Cambia estos valores para probar:
SET @trabajador_id = 1;
SET @fecha = '2026-03-15';
SET @hora = '09:00:00';
SET @dia_semana = DAYOFWEEK(@fecha) - 1; -- 0=Domingo, 1=Lunes, etc.

SELECT
  b.id,
  CONCAT(t.nombres, ' ', t.apellidos) AS terapeuta,
  tb.nombre AS tipo_bloqueo,
  DATE_FORMAT(b.fecha_inicio, '%d/%m/%Y') AS desde,
  DATE_FORMAT(b.fecha_fin, '%d/%m/%Y') AS hasta,
  CASE
    WHEN b.todo_el_dia = TRUE THEN 'Todo el día'
    ELSE CONCAT(TIME_FORMAT(b.hora_inicio, '%H:%i'), ' - ', TIME_FORMAT(b.hora_fin, '%H:%i'))
  END AS horario_bloqueado,
  b.motivo,
  CASE
    WHEN b.todo_el_dia = TRUE THEN '🔴 SÍ ESTÁ BLOQUEADO (todo el día)'
    WHEN @hora >= b.hora_inicio AND @hora < b.hora_fin THEN '🔴 SÍ ESTÁ BLOQUEADO (en ese horario)'
    ELSE '🟢 NO está bloqueado en ese horario'
  END AS resultado
FROM bloqueo_horarios b
INNER JOIN trabajador_centro t ON b.trabajador_id = t.id
INNER JOIN tipo_bloqueo tb ON b.tipo_bloqueo_id = tb.id
WHERE b.trabajador_id = @trabajador_id
  AND b.activo = TRUE
  AND (
    (tb.codigo = 'PUNTUAL' AND b.fecha_inicio = @fecha)
    OR
    (tb.codigo = 'RECURRENTE'
     AND b.dia_semana = @dia_semana
     AND @fecha BETWEEN b.fecha_inicio AND b.fecha_fin)
  );

-- 8️⃣ Estado final
SELECT
  '8. RESUMEN FINAL' AS '═══════════════════════════════════════';

SELECT
  '✅ Sistema de bloqueos instalado correctamente' AS status,
  (SELECT COUNT(*) FROM tipo_bloqueo WHERE activo = TRUE) AS tipos_disponibles,
  (SELECT COUNT(*) FROM bloqueo_horarios WHERE activo = TRUE) AS bloqueos_activos,
  (SELECT COUNT(*) FROM bloqueo_horarios WHERE activo = TRUE AND fecha_fin >= CURDATE()) AS bloqueos_vigentes;
