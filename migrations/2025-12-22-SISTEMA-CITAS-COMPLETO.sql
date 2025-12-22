-- =====================================================
-- SISTEMA DE CITAS COMPLETO - VERSION FINAL
-- Fecha: 2025-12-22
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
-- TABLA 3: citas (PRINCIPAL)
-- Tabla principal de citas - soporta todos los tipos
-- =====================================================
CREATE TABLE IF NOT EXISTS `citas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_cita_id` int NOT NULL COMMENT 'Tipo de cita (NORMAL, REUNION_CLINICA, VISITA_ESCOLAR)',
  `paciente_id` int NOT NULL,
  `doctor_id` int DEFAULT NULL COMMENT 'Terapeuta principal (NULL si permite múltiples)',
  `servicio_id` int DEFAULT NULL COMMENT 'Servicio principal (NULL si permite múltiples)',
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
  KEY `fk_citas_tipo` (`tipo_cita_id`),
  KEY `fk_citas_paciente` (`paciente_id`),
  KEY `fk_citas_doctor` (`doctor_id`),
  KEY `fk_citas_servicio` (`servicio_id`),
  KEY `fk_citas_motivo` (`motivo_id`),
  KEY `fk_citas_estado` (`estado_id`),
  KEY `idx_citas_fecha_doctor` (`fecha`, `doctor_id`),
  KEY `idx_citas_paciente_fecha` (`paciente_id`, `fecha`),
  KEY `idx_citas_estado_fecha` (`estado_id`, `fecha`),
  KEY `idx_citas_tipo_fecha` (`tipo_cita_id`, `fecha`),

  CONSTRAINT `fk_citas_tipo`
    FOREIGN KEY (`tipo_cita_id`)
    REFERENCES `tipos_cita` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_citas_paciente`
    FOREIGN KEY (`paciente_id`)
    REFERENCES `paciente` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_citas_doctor`
    FOREIGN KEY (`doctor_id`)
    REFERENCES `trabajador_centro` (`id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_citas_servicio`
    FOREIGN KEY (`servicio_id`)
    REFERENCES `servicios` (`id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_citas_motivo`
    FOREIGN KEY (`motivo_id`)
    REFERENCES `motivo_cita` (`id`)
    ON DELETE RESTRICT,
  CONSTRAINT `fk_citas_estado`
    FOREIGN KEY (`estado_id`)
    REFERENCES `estado_cita` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA 4: cita_terapeutas
-- Múltiples terapeutas por cita (para REUNION_CLINICA)
-- =====================================================
CREATE TABLE IF NOT EXISTS `cita_terapeutas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cita_id` int NOT NULL COMMENT 'ID de la cita',
  `terapeuta_id` int NOT NULL COMMENT 'ID del terapeuta',
  `es_principal` tinyint(1) DEFAULT 0 COMMENT 'Indica si es el terapeuta principal',
  `user_id_crea` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cita_terapeuta` (`cita_id`, `terapeuta_id`),
  KEY `fk_cita_terapeutas_cita` (`cita_id`),
  KEY `fk_cita_terapeutas_terapeuta` (`terapeuta_id`),

  CONSTRAINT `fk_cita_terapeutas_cita`
    FOREIGN KEY (`cita_id`)
    REFERENCES `citas` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_cita_terapeutas_terapeuta`
    FOREIGN KEY (`terapeuta_id`)
    REFERENCES `trabajador_centro` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Múltiples terapeutas por cita (para reuniones clínicas)';

-- =====================================================
-- TABLA 5: cita_servicios
-- Múltiples servicios por cita (para REUNION_CLINICA)
-- =====================================================
CREATE TABLE IF NOT EXISTS `cita_servicios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cita_id` int NOT NULL COMMENT 'ID de la cita',
  `servicio_id` int NOT NULL COMMENT 'ID del servicio',
  `es_principal` tinyint(1) DEFAULT 0 COMMENT 'Indica si es el servicio principal',
  `user_id_crea` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cita_servicio` (`cita_id`, `servicio_id`),
  KEY `fk_cita_servicios_cita` (`cita_id`),
  KEY `fk_cita_servicios_servicio` (`servicio_id`),

  CONSTRAINT `fk_cita_servicios_cita`
    FOREIGN KEY (`cita_id`)
    REFERENCES `citas` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_cita_servicios_servicio`
    FOREIGN KEY (`servicio_id`)
    REFERENCES `servicios` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Múltiples servicios por cita (para reuniones clínicas)';

-- =====================================================
-- TABLA 6: cita_visita_escolar
-- Datos específicos para citas de tipo VISITA_ESCOLAR
-- =====================================================
CREATE TABLE IF NOT EXISTS `cita_visita_escolar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cita_id` int NOT NULL COMMENT 'ID de la cita relacionada',
  `nombre_colegio` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del colegio',
  `nombre_intermediario` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre de la persona intermediaria',
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Teléfono de contacto',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Observaciones de la visita escolar',
  `user_id_crea` int DEFAULT NULL,
  `user_id_actua` int DEFAULT NULL,
  `fecha_actua` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cita_visita` (`cita_id`),
  KEY `fk_cita_visita_escolar_cita` (`cita_id`),
  KEY `idx_visita_colegio` (`nombre_colegio`),

  CONSTRAINT `fk_cita_visita_escolar_cita`
    FOREIGN KEY (`cita_id`)
    REFERENCES `citas` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Datos específicos de visitas escolares';

-- =====================================================
-- MIGRACIÓN DE DATOS EXISTENTES (SI APLICA)
-- =====================================================

-- Asignar tipo_cita_id a citas existentes (asumiendo que son NORMALES)
UPDATE `citas`
SET `tipo_cita_id` = (SELECT id FROM tipos_cita WHERE codigo = 'NORMAL' LIMIT 1)
WHERE `tipo_cita_id` IS NULL;

-- =====================================================
-- VERIFICACIONES FINALES
-- =====================================================

-- Ver tipos de cita creados
SELECT * FROM tipos_cita;

-- Ver estructura de citas
SHOW CREATE TABLE citas;

-- Contar citas por tipo
SELECT
  t.codigo,
  t.nombre,
  COUNT(c.id) AS total_citas
FROM tipos_cita t
LEFT JOIN citas c ON c.tipo_cita_id = t.id
GROUP BY t.id, t.codigo, t.nombre;

-- =====================================================
-- ✅ MIGRACIÓN COMPLETADA
-- =====================================================

SELECT '✅ SISTEMA DE CITAS CREADO EXITOSAMENTE' AS resultado;
