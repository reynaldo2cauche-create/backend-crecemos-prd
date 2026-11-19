-- ============================================================
-- Solicitudes de reprogramación de citas (aprobación del Admin)
-- Flujo: la 1ª reprogramación del paciente sigue libre para Admisión.
-- A partir de la 2ª, en lugar de bloquearse, Admisión genera una
-- solicitud con los cambios propuestos y el Administrador la
-- acepta/rechaza. Al aceptar se aplica el cambio a la cita.
-- Idempotente: se puede correr varias veces sin romper.
-- ============================================================

CREATE TABLE IF NOT EXISTS `solicitud_reprogramacion` (
  `id` INT NOT NULL AUTO_INCREMENT,

  -- Cita objetivo y paciente
  `cita_id` INT NOT NULL,
  `paciente_id` INT NULL,
  `paciente_nombre` VARCHAR(255) NULL,

  -- Quién la genera (Admisión) y motivo
  `user_crea_id` INT NULL,
  `motivo` TEXT NULL,

  -- Snapshot del estado ACTUAL de la cita (para mostrar "de X a Y")
  `fecha_anterior` DATE NULL,
  `hora_inicio_anterior` TIME NULL,
  `doctor_nombre_anterior` VARCHAR(255) NULL,
  `servicio_nombre_anterior` VARCHAR(255) NULL,
  `motivo_cita_anterior` VARCHAR(255) NULL,

  -- Cambios PROPUESTOS (para display)
  `fecha_nueva` DATE NULL,
  `hora_inicio_nueva` TIME NULL,
  `hora_fin_nueva` TIME NULL,
  `doctor_nombre_nuevo` VARCHAR(255) NULL,
  `servicio_nombre_nuevo` VARCHAR(255) NULL,
  `motivo_cita_nuevo` VARCHAR(255) NULL,

  -- Payload completo que se aplicará a la cita al aprobar (CrearCitaDto serializado)
  `payload_json` LONGTEXT NULL,

  -- Estado de la solicitud: pendiente | aprobada | rechazada
  `estado` VARCHAR(20) NOT NULL DEFAULT 'pendiente',

  -- Revisión del Administrador (user_actua_id = quién la aprobó/rechazó)
  `user_actua_id` INT NULL,
  `fecha_revision` DATETIME NULL,
  `comentario_revisor` TEXT NULL,

  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_solrep_estado` (`estado`),
  KEY `idx_solrep_cita` (`cita_id`),
  KEY `idx_solrep_paciente` (`paciente_id`),
  KEY `idx_solrep_crea` (`user_crea_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Columnas agregadas después (idempotente): si la tabla ya existía
-- sin estas columnas, se añaden. Seguro de re-correr.
-- ============================================================
SET @db := DATABASE();

SET @sql := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'solicitud_reprogramacion' AND COLUMN_NAME = 'motivo_cita_anterior'),
  'ALTER TABLE `solicitud_reprogramacion` ADD COLUMN `motivo_cita_anterior` VARCHAR(255) NULL AFTER `servicio_nombre_anterior`',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'solicitud_reprogramacion' AND COLUMN_NAME = 'motivo_cita_nuevo'),
  'ALTER TABLE `solicitud_reprogramacion` ADD COLUMN `motivo_cita_nuevo` VARCHAR(255) NULL AFTER `servicio_nombre_nuevo`',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
