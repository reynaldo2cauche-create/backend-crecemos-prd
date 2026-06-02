-- =====================================================
-- PLANIFICADOR TERAPÉUTICO  (scope = paciente + servicio)
-- El plan sigue la EVOLUCIÓN de las citas de terapia en el tiempo,
-- sin importar la venta/paquete que las financió.
-- Bloques fijos de 4 sesiones, CONTINUOS en el tiempo (no reinician por venta).
-- Puntaje por objetivo/sesión: 0 / 12.5 / 25.
--
-- ⚠️ Si ya creaste la versión anterior (anclada a venta), córrelo así:
--    DROP TABLE IF EXISTS planificador_sesion;
--    DROP TABLE IF EXISTS planificador_objetivo;
--    DROP TABLE IF EXISTS planificador_bloque;
-- y luego este script.
-- =====================================================

DROP TABLE IF EXISTS `planificador_sesion`;
DROP TABLE IF EXISTS `planificador_objetivo`;
DROP TABLE IF EXISTS `planificador_bloque`;

-- 1. BLOQUE (un "plan" de 4 sesiones dentro de la línea de tiempo del servicio)
CREATE TABLE `planificador_bloque` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,

  `paciente_id` INT(11) NOT NULL,
  `servicio_id` INT(11) NOT NULL,
  `terapeuta_id` INT(11) NULL COMMENT 'Terapeuta dueño del plan (doctor de las citas)',

  `numero_bloque` INT(11) NOT NULL COMMENT 'Correlativo continuo: 1, 2, 3...',
  `sesion_desde` INT(11) NOT NULL COMMENT 'N° de sesión inicial en la línea de tiempo (1, 5, 9...)',
  `sesion_hasta` INT(11) NOT NULL COMMENT 'N° de sesión final (4, 8...)',

  `estado` ENUM('ABIERTO','CERRADO') NOT NULL DEFAULT 'ABIERTO',
  `observacion_cierre` TEXT NULL,

  `user_id_crea` INT(11) NULL,
  `user_id_actua` INT(11) NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `fk_plan_bloque_paciente` FOREIGN KEY (`paciente_id`)
    REFERENCES `paciente`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_plan_bloque_servicio` FOREIGN KEY (`servicio_id`)
    REFERENCES `servicios`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_plan_bloque_terapeuta` FOREIGN KEY (`terapeuta_id`)
    REFERENCES `trabajador_centro`(`id`) ON DELETE SET NULL,

  UNIQUE KEY `uq_servicio_bloque` (`paciente_id`, `servicio_id`, `numero_bloque`),
  INDEX `idx_plan_bloque_terapeuta` (`terapeuta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 2. OBJETIVO (definido en el bloque, se repite en sus 4 sesiones)
CREATE TABLE `planificador_objetivo` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bloque_id` INT(11) NOT NULL,

  `titulo` VARCHAR(200) NOT NULL,
  `objetivo_especifico` TEXT NULL,
  `actividad_ejemplo` TEXT NULL,
  `materiales` TEXT NULL,
  `orden` INT(11) NOT NULL DEFAULT 0,

  `estado_logro` ENUM('PENDIENTE','LOGRADO','NO_LOGRADO') NOT NULL DEFAULT 'PENDIENTE',
  `continuado_de_objetivo_id` INT(11) NULL,

  `user_id_crea` INT(11) NULL,
  `user_id_actua` INT(11) NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `fk_plan_obj_bloque` FOREIGN KEY (`bloque_id`)
    REFERENCES `planificador_bloque`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_plan_obj_continua` FOREIGN KEY (`continuado_de_objetivo_id`)
    REFERENCES `planificador_objetivo`(`id`) ON DELETE SET NULL,

  INDEX `idx_plan_obj_bloque` (`bloque_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3. REGISTRO POR SESIÓN (resultado de un objetivo en una sesión del bloque)
CREATE TABLE `planificador_sesion` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `objetivo_id` INT(11) NOT NULL,
  `bloque_id` INT(11) NOT NULL,

  `numero_sesion` INT(11) NOT NULL COMMENT 'N° de sesión en la línea de tiempo del servicio (1..N)',
  `cita_id` INT(11) NULL COMMENT 'Cita real; NULL si la sesión está "por agendar"',

  `resultado` ENUM('NO_LOGRADO','EN_PROCESO','LOGRADO') NULL,
  `puntaje` DECIMAL(5,2) AS (
    CASE `resultado`
      WHEN 'LOGRADO'    THEN 25.0
      WHEN 'EN_PROCESO' THEN 12.5
      WHEN 'NO_LOGRADO' THEN 0.0
      ELSE 0.0
    END
  ) STORED,

  `observaciones` TEXT NULL,
  `fecha_registro` DATETIME NULL,
  `registrado_por` INT(11) NULL,

  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `fk_plan_ses_objetivo` FOREIGN KEY (`objetivo_id`)
    REFERENCES `planificador_objetivo`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_plan_ses_bloque` FOREIGN KEY (`bloque_id`)
    REFERENCES `planificador_bloque`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_plan_ses_cita` FOREIGN KEY (`cita_id`)
    REFERENCES `citas`(`id`) ON DELETE SET NULL,

  UNIQUE KEY `uq_objetivo_sesion` (`objetivo_id`, `numero_sesion`),
  INDEX `idx_plan_ses_bloque` (`bloque_id`),
  INDEX `idx_plan_ses_cita` (`cita_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
