-- =====================================================
-- CORRECCIONES AL SISTEMA DE CITAS
-- Fecha: 2025-12-22
-- =====================================================

-- =====================================================
-- CORRECCIÓN 1: ELIMINAR tipo_cita_id de tabla citas
-- (Ya no es necesario porque está en motivo_cita)
-- =====================================================

-- Eliminar FK si existe
SET @fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'citas'
    AND CONSTRAINT_NAME = 'fk_citas_tipo'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE `citas` DROP FOREIGN KEY `fk_citas_tipo`',
  'SELECT ''FK fk_citas_tipo no existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar índice si existe
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'citas'
    AND INDEX_NAME = 'idx_citas_tipo'
);

SET @sql = IF(@idx_exists > 0,
  'DROP INDEX `idx_citas_tipo` ON `citas`',
  'SELECT ''Índice idx_citas_tipo no existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar columna tipo_cita_id
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'citas'
    AND COLUMN_NAME = 'tipo_cita_id'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE `citas` DROP COLUMN `tipo_cita_id`',
  'SELECT ''Columna tipo_cita_id no existe en citas'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- CORRECCIÓN 2: Cambiar id_estado a estado_cita_id
-- en tabla cita_reunion_clinica
-- =====================================================

-- Eliminar FK antigua
ALTER TABLE `cita_reunion_clinica`
DROP FOREIGN KEY `fk_reunion_estado`;

-- Renombrar columna
ALTER TABLE `cita_reunion_clinica`
CHANGE COLUMN `id_estado` `estado_cita_id` int NOT NULL COMMENT 'Estado de la reunión clínica';

-- Recrear FK con tabla estado_cita
ALTER TABLE `cita_reunion_clinica`
ADD CONSTRAINT `fk_reunion_estado_cita`
  FOREIGN KEY (`estado_cita_id`)
  REFERENCES `estado_cita` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- =====================================================
-- CORRECCIÓN 3: Agregar campos faltantes a cita_reunion_clinica
-- =====================================================

-- Verificar y agregar paciente_id
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND COLUMN_NAME = 'paciente_id'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD COLUMN `paciente_id` int NOT NULL COMMENT ''Paciente de la reunión'' AFTER `id`',
  'SELECT ''Columna paciente_id ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar motivo_id
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND COLUMN_NAME = 'motivo_id'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD COLUMN `motivo_id` int NOT NULL COMMENT ''Motivo de la reunión'' AFTER `paciente_id`',
  'SELECT ''Columna motivo_id ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar fecha
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND COLUMN_NAME = 'fecha'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD COLUMN `fecha` date NOT NULL COMMENT ''Fecha de la reunión'' AFTER `motivo_id`',
  'SELECT ''Columna fecha ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar hora_inicio
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND COLUMN_NAME = 'hora_inicio'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD COLUMN `hora_inicio` time NOT NULL COMMENT ''Hora de inicio'' AFTER `fecha`',
  'SELECT ''Columna hora_inicio ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar hora_fin
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND COLUMN_NAME = 'hora_fin'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD COLUMN `hora_fin` time DEFAULT NULL COMMENT ''Hora de fin'' AFTER `hora_inicio`',
  'SELECT ''Columna hora_fin ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar duracion_minutos
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND COLUMN_NAME = 'duracion_minutos'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD COLUMN `duracion_minutos` int NOT NULL COMMENT ''Duración en minutos'' AFTER `hora_fin`',
  'SELECT ''Columna duracion_minutos ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar nota
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND COLUMN_NAME = 'nota'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD COLUMN `nota` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT ''Notas de la reunión'' AFTER `duracion_minutos`',
  'SELECT ''Columna nota ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar firma_documento
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND COLUMN_NAME = 'firma_documento'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD COLUMN `firma_documento` tinyint(1) DEFAULT 0 COMMENT ''Si firmó documento de consentimiento'' AFTER `nota`',
  'SELECT ''Columna firma_documento ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar FKs para las nuevas columnas
SET @fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND CONSTRAINT_NAME = 'fk_reunion_paciente'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD CONSTRAINT `fk_reunion_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `paciente` (`id`) ON DELETE CASCADE',
  'SELECT ''FK fk_reunion_paciente ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND CONSTRAINT_NAME = 'fk_reunion_motivo'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `cita_reunion_clinica` ADD CONSTRAINT `fk_reunion_motivo` FOREIGN KEY (`motivo_id`) REFERENCES `motivo_cita` (`id`) ON DELETE RESTRICT',
  'SELECT ''FK fk_reunion_motivo ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índices
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cita_reunion_clinica'
    AND INDEX_NAME = 'idx_reunion_fecha'
);

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_reunion_fecha` ON `cita_reunion_clinica` (`fecha`)',
  'SELECT ''Índice idx_reunion_fecha ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- VERIFICACIONES FINALES
-- =====================================================

-- Mostrar estructura de citas (sin tipo_cita_id)
SHOW CREATE TABLE citas;

-- Mostrar estructura de cita_reunion_clinica (con estado_cita_id)
SHOW CREATE TABLE cita_reunion_clinica;

-- Mostrar estructura de cita_visita_escolar
SHOW CREATE TABLE cita_visita_escolar;

-- =====================================================
-- ✅ CORRECCIONES COMPLETADAS
-- =====================================================

SELECT '✅ CORRECCIONES APLICADAS EXITOSAMENTE' AS resultado;
