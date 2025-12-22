-- =====================================================
-- MIGRACIÓN COMPLETA: Sistema de Notificaciones
-- Fecha: 2025-12-22
-- Objetivo: Relacionar correctamente notificaciones
--           con configuracion_notificaciones mediante FK
--
-- ESTRUCTURA CORRECTA (SIN REDUNDANCIAS):
--
-- configuracion_notificaciones:
--   - id (PK)
--   - tipo (VARCHAR UNIQUE) - Identificador del tipo
--   - activa (BOOLEAN) - Si está activa o no
--   - descripcion (TEXT) - Descripción administrativa
--   - dias_anticipacion (INT) - Días antes de notificar
--
-- notificaciones:
--   - id (PK)
--   - configuracion_id (FK) - Relación a configuracion
--   - usuario_id (FK)
--   - titulo (VARCHAR) - Título dinámico de la notificación
--   - mensaje (TEXT) - Mensaje dinámico de la notificación
--   - leida, fecha_leida, datos_adicionales, fecha_creacion
--
-- =====================================================

-- =====================================================
-- PASO 1: RESPALDAR DATOS ACTUALES (IMPORTANTE)
-- =====================================================
CREATE TABLE IF NOT EXISTS `notificaciones_backup` LIKE `notificaciones`;
INSERT INTO `notificaciones_backup` SELECT * FROM `notificaciones`;

-- Verificar respaldo
SELECT COUNT(*) AS total_respaldado FROM notificaciones_backup;

-- =====================================================
-- PASO 2: AGREGAR COLUMNA configuracion_id TEMPORAL
-- =====================================================
ALTER TABLE `notificaciones`
ADD COLUMN `configuracion_id` int DEFAULT NULL AFTER `id`;

-- =====================================================
-- PASO 3: MAPEAR tipo ENUM -> configuracion_id
-- =====================================================

-- CUMPLEANOS_PACIENTE (id=1)
UPDATE `notificaciones` n
INNER JOIN `configuracion_notificaciones` c ON c.tipo = 'CUMPLEANOS_PACIENTE'
SET n.configuracion_id = c.id
WHERE n.tipo = 'CUMPLEANOS_PACIENTE';

-- ANIVERSARIO_EMPLEADO (id=2)
UPDATE `notificaciones` n
INNER JOIN `configuracion_notificaciones` c ON c.tipo = 'ANIVERSARIO_EMPLEADO'
SET n.configuracion_id = c.id
WHERE n.tipo = 'ANIVERSARIO_EMPLEADO';

-- LOGIN_FUERA_HORARIO (id=3)
UPDATE `notificaciones` n
INNER JOIN `configuracion_notificaciones` c ON c.tipo = 'LOGIN_FUERA_HORARIO'
SET n.configuracion_id = c.id
WHERE n.tipo = 'LOGIN_FUERA_HORARIO';

-- CITA_ELIMINADA (id=4)
UPDATE `notificaciones` n
INNER JOIN `configuracion_notificaciones` c ON c.tipo = 'CITA_ELIMINADA'
SET n.configuracion_id = c.id
WHERE n.tipo = 'CITA_ELIMINADA';

-- =====================================================
-- PASO 4: VERIFICAR QUE TODOS TIENEN configuracion_id
-- =====================================================
SELECT COUNT(*) AS registros_sin_mapear
FROM notificaciones
WHERE configuracion_id IS NULL;

-- Si el resultado es 0, ¡perfecto! Continúa.
-- Si hay registros sin mapear, revisa los tipos que no coinciden.

-- =====================================================
-- PASO 5: HACER configuracion_id NOT NULL
-- =====================================================
ALTER TABLE `notificaciones`
MODIFY COLUMN `configuracion_id` int NOT NULL;

-- =====================================================
-- PASO 6: ELIMINAR LA COLUMNA tipo (ENUM)
-- =====================================================
ALTER TABLE `notificaciones`
DROP COLUMN `tipo`;

-- =====================================================
-- PASO 7: ELIMINAR ÍNDICE ANTIGUO idx_tipo
-- =====================================================
DROP INDEX `idx_tipo` ON `notificaciones`;

-- =====================================================
-- PASO 8: CREAR NUEVO ÍNDICE PARA configuracion_id
-- =====================================================
CREATE INDEX `idx_configuracion` ON `notificaciones` (`configuracion_id`);

-- =====================================================
-- PASO 9: AGREGAR FOREIGN KEY
-- =====================================================
ALTER TABLE `notificaciones`
ADD CONSTRAINT `fk_notificacion_configuracion`
  FOREIGN KEY (`configuracion_id`)
  REFERENCES `configuracion_notificaciones` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- =====================================================
-- PASO 10: RENOMBRAR CONSTRAINTS EXISTENTES (OPCIONAL - PARA ORDEN)
-- =====================================================
-- Eliminar constraints antiguos
ALTER TABLE `notificaciones` DROP FOREIGN KEY `notificaciones_ibfk_1`;
ALTER TABLE `notificaciones` DROP FOREIGN KEY `notificaciones_ibfk_2`;
ALTER TABLE `notificaciones` DROP FOREIGN KEY `notificaciones_ibfk_3`;

-- Recrear con nombres descriptivos
ALTER TABLE `notificaciones`
ADD CONSTRAINT `fk_notificacion_usuario`
  FOREIGN KEY (`usuario_id`)
  REFERENCES `trabajador_centro` (`id`)
  ON DELETE CASCADE;

ALTER TABLE `notificaciones`
ADD CONSTRAINT `fk_notificacion_paciente`
  FOREIGN KEY (`paciente_id`)
  REFERENCES `paciente` (`id`)
  ON DELETE CASCADE;

ALTER TABLE `notificaciones`
ADD CONSTRAINT `fk_notificacion_empleado`
  FOREIGN KEY (`empleado_id`)
  REFERENCES `trabajador_centro` (`id`)
  ON DELETE CASCADE;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver estructura final
SHOW CREATE TABLE notificaciones;

-- Ver datos migrados
SELECT
  n.id,
  n.configuracion_id,
  c.tipo,
  n.titulo,
  n.mensaje,
  n.leida
FROM notificaciones n
INNER JOIN configuracion_notificaciones c ON n.configuracion_id = c.id
LIMIT 10;

-- Verificar integridad referencial
SELECT
  'notificaciones' AS tabla,
  COUNT(*) AS total,
  COUNT(DISTINCT configuracion_id) AS tipos_distintos
FROM notificaciones;

-- =====================================================
-- ✅ MIGRACIÓN COMPLETADA
-- =====================================================
-- Si todo salió bien, puedes eliminar el respaldo:
-- DROP TABLE IF EXISTS `notificaciones_backup`;
--
-- Si algo salió mal, puedes restaurar:
-- DROP TABLE `notificaciones`;
-- RENAME TABLE `notificaciones_backup` TO `notificaciones`;
-- =====================================================

SELECT '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE' AS resultado;
