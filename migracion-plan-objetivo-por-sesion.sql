-- =====================================================
-- MIGRACIÓN: asignación de objetivos POR SESIÓN
-- (antes la asignación era por BLOQUE de 4 sesiones).
-- Los bloques de 4 sesiones se conservan solo como agrupación visual;
-- ahora cada sesión elige sus propios objetivos específicos.
--
-- IDEMPOTENTE: se puede ejecutar varias veces sin duplicar ni romper nada.
-- Ejecutar sobre la BD ya seleccionada (USE tu_base;).
-- =====================================================

SET SQL_SAFE_UPDATES = 0;

-- 1) numero_bloque pasa a opcional (legado). Re-ejecutable sin problema.
ALTER TABLE `plan_bloque_objetivo`
  MODIFY `numero_bloque` INT(11) NULL COMMENT 'LEGADO (asignación por bloque)';

-- 2) Agregar columna numero_sesion solo si no existe.
SET @x := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE table_schema = DATABASE()
             AND table_name = 'plan_bloque_objetivo'
             AND column_name = 'numero_sesion');
SET @sql := IF(@x = 0,
  'ALTER TABLE plan_bloque_objetivo ADD COLUMN numero_sesion INT(11) NULL COMMENT ''Sesión a la que se asigna el objetivo'' AFTER numero_bloque',
  'SELECT ''numero_sesion ya existe''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 3) Expandir cada asignación de bloque en sus 4 sesiones, SIN duplicar
--    (NOT EXISTS evita volver a insertar lo ya expandido en corridas previas).
INSERT INTO `plan_bloque_objetivo`
  (`plan_id`, `objetivo_especifico_id`, `numero_bloque`, `numero_sesion`, `user_id_crea`, `flg_activo`)
SELECT b.`plan_id`,
       b.`objetivo_especifico_id`,
       NULL,
       (b.`numero_bloque` - 1) * 4 + n.k AS numero_sesion,
       b.`user_id_crea`,
       1
FROM `plan_bloque_objetivo` b
JOIN (SELECT 1 AS k UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) n
WHERE b.`flg_activo` = 1
  AND b.`numero_bloque` IS NOT NULL
  AND b.`numero_sesion` IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `plan_bloque_objetivo` x
     WHERE x.`objetivo_especifico_id` = b.`objetivo_especifico_id`
       AND x.`numero_sesion` = (b.`numero_bloque` - 1) * 4 + n.k
  );

-- 3b) Limpiar duplicados por-sesión que hayan quedado de corridas anteriores
--     (conserva la fila de menor id por cada objetivo+sesión).
DELETE t1 FROM `plan_bloque_objetivo` t1
JOIN `plan_bloque_objetivo` t2
  ON t1.`objetivo_especifico_id` = t2.`objetivo_especifico_id`
 AND t1.`numero_sesion` = t2.`numero_sesion`
 AND t1.`id` > t2.`id`
WHERE t1.`numero_sesion` IS NOT NULL;

-- 4) Desactivar las filas viejas (asignadas por bloque).
UPDATE `plan_bloque_objetivo`
   SET `flg_activo` = 0
 WHERE `numero_bloque` IS NOT NULL
   AND `numero_sesion` IS NULL;

-- 5) Crear índice único uq_so (objetivo, sesión) solo si no existe.
SET @x := (SELECT COUNT(*) FROM information_schema.STATISTICS
           WHERE table_schema = DATABASE()
             AND table_name = 'plan_bloque_objetivo'
             AND index_name = 'uq_so');
SET @sql := IF(@x = 0,
  'ALTER TABLE plan_bloque_objetivo ADD UNIQUE KEY uq_so (objetivo_especifico_id, numero_sesion)',
  'SELECT ''uq_so ya existe''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 6) Dropear el índice viejo uq_bo solo si todavía existe.
SET @x := (SELECT COUNT(*) FROM information_schema.STATISTICS
           WHERE table_schema = DATABASE()
             AND table_name = 'plan_bloque_objetivo'
             AND index_name = 'uq_bo');
SET @sql := IF(@x > 0,
  'ALTER TABLE plan_bloque_objetivo DROP INDEX uq_bo',
  'SELECT ''uq_bo ya no existe''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 7) Índice de apoyo idx_so_plan solo si no existe.
SET @x := (SELECT COUNT(*) FROM information_schema.STATISTICS
           WHERE table_schema = DATABASE()
             AND table_name = 'plan_bloque_objetivo'
             AND index_name = 'idx_so_plan');
SET @sql := IF(@x = 0,
  'ALTER TABLE plan_bloque_objetivo ADD INDEX idx_so_plan (plan_id, numero_sesion, flg_activo)',
  'SELECT ''idx_so_plan ya existe''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET SQL_SAFE_UPDATES = 1;
