-- =====================================================
-- Migración: Cambiar tipo de notificación de ENUM a VARCHAR
-- Fecha: 2025-12-22
-- Razón: Permitir agregar nuevos tipos de notificación
--        sin tener que modificar la tabla cada vez
-- =====================================================

-- PASO 1: Crear una nueva columna temporal VARCHAR
ALTER TABLE `notificaciones`
ADD COLUMN `tipo_temp` VARCHAR(50) NULL AFTER `tipo`;

-- PASO 2: Copiar los valores del ENUM a la nueva columna VARCHAR
UPDATE `notificaciones`
SET `tipo_temp` = CAST(`tipo` AS CHAR);

-- PASO 3: Eliminar la columna ENUM antigua
ALTER TABLE `notificaciones`
DROP COLUMN `tipo`;

-- PASO 4: Renombrar la columna temporal al nombre original
ALTER TABLE `notificaciones`
CHANGE COLUMN `tipo_temp` `tipo` VARCHAR(50) NOT NULL;

-- PASO 5: Recrear el índice sobre la columna tipo
DROP INDEX `idx_tipo` ON `notificaciones`;
CREATE INDEX `idx_tipo` ON `notificaciones` (`tipo`);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecutar esto para verificar que la migración fue exitosa:
-- SELECT * FROM notificaciones LIMIT 5;
-- SHOW COLUMNS FROM notificaciones LIKE 'tipo';

-- =====================================================
-- ROLLBACK (en caso de necesitar revertir)
-- =====================================================
-- ALTER TABLE `notificaciones`
-- DROP COLUMN `tipo`;
--
-- ALTER TABLE `notificaciones`
-- ADD COLUMN `tipo` ENUM('CUMPLEANOS_PACIENTE','ANIVERSARIO_EMPLEADO','LOGIN_FUERA_HORARIO','CITA_ELIMINADA') NOT NULL;
--
-- CREATE INDEX `idx_tipo` ON `notificaciones` (`tipo`);
