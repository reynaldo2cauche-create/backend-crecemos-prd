-- =====================================================
-- SISTEMA DE CITAS COMPLETO - VERSION FINAL v2
-- Fecha: 2025-12-22
-- =====================================================
-- ESTRUCTURA:
-- - citas: Solo citas NORMALES (tabla antigua sin modificar)
-- - cita_reunion_clinica: Reuniones clínicas (con múltiples terapeutas/servicios)
-- - cita_reunion_clinica_terapeutas: Terapeutas de la reunión
-- - cita_reunion_clinica_servicios: Servicios de la reunión
-- - cita_visita_escolar: Visitas escolares (con datos del colegio)
-- =====================================================

-- =====================================================
-- TABLA 1: tipos_cita (MAESTRO)
-- Define los tipos de citas disponibles
-- =====================================================
CREATE TABLE IF NOT EXISTS `tipos_cita` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Código único del tipo (NORMAL, REUNION_CLINICA, VISITA_ESCOLAR)',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre descriptivo del tipo',
  `descripcion` text COLLATE utf8mb4_unicode_ci COMMENT 'Descripción detallada',
  `requiere_terapeuta` tinyint(1) DEFAULT 1 COMMENT 'Si requiere asignar terapeuta',
  `permite_multiples_terapeutas` tinyint(1) DEFAULT 0 COMMENT 'Si permite múltiples terapeutas',
  `permite_multiples_servicios` tinyint(1) DEFAULT 0 COMMENT 'Si permite múltiples servicios',
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_unique` (`codigo`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de tipos de cita';

-- Insertar tipos de cita iniciales
INSERT INTO `tipos_cita` (`codigo`, `nombre`, `descripcion`, `requiere_terapeuta`, `permite_multiples_terapeutas`, `permite_multiples_servicios`, `activo`) VALUES
('NORMAL', 'Cita Normal', 'Cita estándar de terapia individual', 1, 0, 0, 1),
('REUNION_CLINICA', 'Reunión Clínica', 'Reunión clínica con múltiples terapeutas y servicios', 1, 1, 1, 1),
('VISITA_ESCOLAR', 'Visita Escolar', 'Visita a colegio del paciente', 1, 0, 0, 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- =====================================================
-- TABLA 2: motivo_cita
-- Motivos de consulta por tipo de cita
-- =====================================================
CREATE TABLE IF NOT EXISTS `motivo_cita` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_cita_id` int NOT NULL COMMENT 'Tipo de cita al que pertenece este motivo',
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tipo_cita` (`tipo_cita_id`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_motivo_tipo_cita`
    FOREIGN KEY (`tipo_cita_id`)
    REFERENCES `tipos_cita` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA 3: citas (SOLO CITAS NORMALES - NO SE MODIFICA)
-- Se mantiene como está para no migrar citas antiguas
-- =====================================================
-- Ya existe en tu BD, solo agregamos tipo_cita_id si no existe

-- Verificar si la columna tipo_cita_id existe
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'citas'
    AND COLUMN_NAME = 'tipo_cita_id'
);

-- Agregar tipo_cita_id si no existe
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `citas` ADD COLUMN `tipo_cita_id` int NOT NULL DEFAULT 1 COMMENT ''Tipo de cita (1=NORMAL)'' AFTER `id`',
  'SELECT ''La columna tipo_cita_id ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar FK si no existe
SET @fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'citas'
    AND CONSTRAINT_NAME = 'fk_citas_tipo'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `citas` ADD CONSTRAINT `fk_citas_tipo` FOREIGN KEY (`tipo_cita_id`) REFERENCES `tipos_cita` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''La FK fk_citas_tipo ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índice si no existe
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'citas'
    AND INDEX_NAME = 'idx_citas_tipo'
);

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_citas_tipo` ON `citas` (`tipo_cita_id`)',
  'SELECT ''El índice idx_citas_tipo ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- TABLA 4: cita_reunion_clinica
-- Reuniones clínicas (múltiples terapeutas y servicios)
-- =====================================================
CREATE TABLE IF NOT EXISTS `cita_reunion_clinica` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_cita_id` int NOT NULL DEFAULT 2 COMMENT 'Siempre 2 (REUNION_CLINICA)',
  `paciente_id` int NOT NULL,
  `motivo_id` int NOT NULL,
  `estado_id` int NOT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time DEFAULT NULL,
  `duracion_minutos` int NOT NULL,
  `nota` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `firma_documento` tinyint(1) DEFAULT 0 COMMENT 'Indica si el paciente firmó el documento de consentimiento',
  `user_id_crea` int DEFAULT NULL,
  `user_id_actua` int DEFAULT NULL,
  `fecha_actua` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_reunion_tipo` (`tipo_cita_id`),
  KEY `fk_reunion_paciente` (`paciente_id`),
  KEY `fk_reunion_motivo` (`motivo_id`),
  KEY `fk_reunion_estado` (`estado_id`),
  KEY `idx_reunion_fecha` (`fecha`),
  KEY `idx_reunion_paciente_fecha` (`paciente_id`, `fecha`),
  KEY `idx_reunion_estado_fecha` (`estado_id`, `fecha`),

  CONSTRAINT `fk_reunion_tipo`
    FOREIGN KEY (`tipo_cita_id`)
    REFERENCES `tipos_cita` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_reunion_paciente`
    FOREIGN KEY (`paciente_id`)
    REFERENCES `paciente` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_reunion_motivo`
    FOREIGN KEY (`motivo_id`)
    REFERENCES `motivo_cita` (`id`)
    ON DELETE RESTRICT,
  CONSTRAINT `fk_reunion_estado`
    FOREIGN KEY (`estado_id`)
    REFERENCES `estado_cita` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Reuniones clínicas con múltiples terapeutas y servicios';

-- =====================================================
-- TABLA 5: cita_reunion_clinica_terapeutas
-- Múltiples terapeutas por reunión clínica
-- =====================================================
CREATE TABLE IF NOT EXISTS `cita_reunion_clinica_terapeutas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reunion_id` int NOT NULL COMMENT 'ID de la reunión clínica',
  `terapeuta_id` int NOT NULL COMMENT 'ID del terapeuta',
  `es_coordinador` tinyint(1) DEFAULT 0 COMMENT 'Indica si es el terapeuta coordinador',
  `user_id_crea` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reunion_terapeuta` (`reunion_id`, `terapeuta_id`),
  KEY `fk_reunion_terapeutas_reunion` (`reunion_id`),
  KEY `fk_reunion_terapeutas_terapeuta` (`terapeuta_id`),

  CONSTRAINT `fk_reunion_terapeutas_reunion`
    FOREIGN KEY (`reunion_id`)
    REFERENCES `cita_reunion_clinica` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_reunion_terapeutas_terapeuta`
    FOREIGN KEY (`terapeuta_id`)
    REFERENCES `trabajador_centro` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Múltiples terapeutas por reunión clínica';

-- =====================================================
-- TABLA 6: cita_reunion_clinica_servicios
-- Múltiples servicios por reunión clínica
-- =====================================================
CREATE TABLE IF NOT EXISTS `cita_reunion_clinica_servicios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reunion_id` int NOT NULL COMMENT 'ID de la reunión clínica',
  `servicio_id` int NOT NULL COMMENT 'ID del servicio',
  `user_id_crea` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reunion_servicio` (`reunion_id`, `servicio_id`),
  KEY `fk_reunion_servicios_reunion` (`reunion_id`),
  KEY `fk_reunion_servicios_servicio` (`servicio_id`),

  CONSTRAINT `fk_reunion_servicios_reunion`
    FOREIGN KEY (`reunion_id`)
    REFERENCES `cita_reunion_clinica` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_reunion_servicios_servicio`
    FOREIGN KEY (`servicio_id`)
    REFERENCES `servicios` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Múltiples servicios por reunión clínica';

-- =====================================================
-- TABLA 7: cita_visita_escolar
-- Visitas escolares con datos del colegio
-- =====================================================
CREATE TABLE IF NOT EXISTS `cita_visita_escolar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_cita_id` int NOT NULL DEFAULT 3 COMMENT 'Siempre 3 (VISITA_ESCOLAR)',
  `paciente_id` int NOT NULL,
  `terapeuta_id` int NOT NULL COMMENT 'Terapeuta que realiza la visita',
  `servicio_id` int NOT NULL,
  `motivo_id` int NOT NULL,
  `estado_id` int NOT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time DEFAULT NULL,
  `duracion_minutos` int NOT NULL,
  `nombre_colegio` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del colegio',
  `nombre_intermediario` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre de la persona intermediaria',
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Teléfono de contacto',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Observaciones de la visita escolar',
  `nota` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `firma_documento` tinyint(1) DEFAULT 0,
  `user_id_crea` int DEFAULT NULL,
  `user_id_actua` int DEFAULT NULL,
  `fecha_actua` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_visita_tipo` (`tipo_cita_id`),
  KEY `fk_visita_paciente` (`paciente_id`),
  KEY `fk_visita_terapeuta` (`terapeuta_id`),
  KEY `fk_visita_servicio` (`servicio_id`),
  KEY `fk_visita_motivo` (`motivo_id`),
  KEY `fk_visita_estado` (`estado_id`),
  KEY `idx_visita_colegio` (`nombre_colegio`),
  KEY `idx_visita_fecha` (`fecha`),

  CONSTRAINT `fk_visita_tipo`
    FOREIGN KEY (`tipo_cita_id`)
    REFERENCES `tipos_cita` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_visita_paciente`
    FOREIGN KEY (`paciente_id`)
    REFERENCES `paciente` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_visita_terapeuta`
    FOREIGN KEY (`terapeuta_id`)
    REFERENCES `trabajador_centro` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_visita_servicio`
    FOREIGN KEY (`servicio_id`)
    REFERENCES `servicios` (`id`)
    ON DELETE RESTRICT,
  CONSTRAINT `fk_visita_motivo`
    FOREIGN KEY (`motivo_id`)
    REFERENCES `motivo_cita` (`id`)
    ON DELETE RESTRICT,
  CONSTRAINT `fk_visita_estado`
    FOREIGN KEY (`estado_id`)
    REFERENCES `estado_cita` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Visitas escolares con datos del colegio';

-- =====================================================
-- ASIGNAR TIPO A CITAS EXISTENTES
-- =====================================================
UPDATE `citas`
SET `tipo_cita_id` = 1
WHERE `tipo_cita_id` IS NULL OR `tipo_cita_id` = 0;

-- =====================================================
-- VERIFICACIONES FINALES
-- =====================================================

-- Ver tipos de cita creados
SELECT * FROM tipos_cita;

-- Contar registros por tabla
SELECT 'citas (NORMAL)' AS tabla, COUNT(*) AS total FROM citas
UNION ALL
SELECT 'cita_reunion_clinica', COUNT(*) FROM cita_reunion_clinica
UNION ALL
SELECT 'cita_visita_escolar', COUNT(*) FROM cita_visita_escolar;

-- =====================================================
-- ✅ MIGRACIÓN COMPLETADA
-- =====================================================

SELECT '✅ SISTEMA DE CITAS CREADO EXITOSAMENTE' AS resultado;
