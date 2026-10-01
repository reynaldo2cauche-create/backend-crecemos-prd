-- =====================================================
-- MIGRACIÓN: convertir TODA la base de datos a utf8mb4
--
-- Resuelve de raíz el error "Incorrect string value" al guardar caracteres
-- UTF-8 multibyte (→ – “ ” … emojis) en CUALQUIER campo de texto.
-- Operación NO destructiva: utf8mb4 es superconjunto de latin1/utf8, el texto
-- existente se conserva (ver excepción de doble-codificación en las notas).
--
-- ⚠️ ANTES: haz backup y verifica que las tildes existentes se vean bien
--    (ej. "evaluación", NO "evaluaciÃ³n"). Si se ven rotas, NO uses esto.
-- =====================================================

-- PASO 1 — Charset por defecto de la BD (afecta solo tablas NUEVAS)
-- Reemplaza NOMBRE_BD por el nombre real de tu base de datos.
ALTER DATABASE `NOMBRE_BD` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- PASO 2 — Generar los ALTER de TODAS las tablas existentes.
-- Ejecuta esta consulta; te devuelve una lista de sentencias ALTER TABLE.
-- Copia el resultado y ejecútalo (es el que realmente convierte cada tabla).
SELECT CONCAT('ALTER TABLE `', TABLE_NAME,
              '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;') AS sentencia
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'NOMBRE_BD'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- (Ejecuta cada sentencia que devolvió el paso 2.)
