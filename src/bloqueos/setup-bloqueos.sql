-- ============================================
-- SCRIPT DE INSTALACIÓN: Sistema de Bloqueos
-- ============================================

-- 1. Crear tabla de tipos de bloqueo
CREATE TABLE IF NOT EXISTS `tipo_bloqueo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_codigo` (`codigo`),
  INDEX `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insertar datos iniciales
INSERT INTO tipo_bloqueo (codigo, nombre, descripcion) VALUES
('PUNTUAL', 'Bloqueo Puntual', 'Bloqueo para una fecha específica (ej: día de cumpleaños, cita médica)'),
('RECURRENTE', 'Bloqueo Recurrente', 'Bloqueo que se repite semanalmente en un rango de fechas (ej: curso todos los martes)')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), descripcion=VALUES(descripcion);

-- 3. Crear tabla de bloqueos de horarios
CREATE TABLE IF NOT EXISTS `bloqueo_horarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `trabajador_id` INT NOT NULL,
  `tipo_bloqueo_id` INT NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `dia_semana` TINYINT NULL,
  `todo_el_dia` BOOLEAN NOT NULL DEFAULT FALSE,
  `hora_inicio` TIME NULL,
  `hora_fin` TIME NULL,
  `motivo` TEXT NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `user_id_crea` INT NULL,
  `user_id_actua` INT NULL,
  `fecha_actua` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_trabajador` (`trabajador_id`),
  INDEX `idx_tipo_bloqueo` (`tipo_bloqueo_id`),
  INDEX `idx_fechas` (`fecha_inicio`, `fecha_fin`),
  INDEX `idx_activo` (`activo`),
  INDEX `idx_dia_semana` (`dia_semana`),

  CONSTRAINT `fk_bloqueo_trabajador`
    FOREIGN KEY (`trabajador_id`)
    REFERENCES `trabajador_centro` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_bloqueo_tipo`
    FOREIGN KEY (`tipo_bloqueo_id`)
    REFERENCES `tipo_bloqueo` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_bloqueo_user_crea`
    FOREIGN KEY (`user_id_crea`)
    REFERENCES `trabajador_centro` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `fk_bloqueo_user_actua`
    FOREIGN KEY (`user_id_actua`)
    REFERENCES `trabajador_centro` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT `chk_dia_semana` CHECK (`dia_semana` IS NULL OR (`dia_semana` >= 0 AND `dia_semana` <= 6)),
  CONSTRAINT `chk_fecha_fin_mayor` CHECK (`fecha_fin` >= `fecha_inicio`),
  CONSTRAINT `chk_horario_valido` CHECK (
    (`todo_el_dia` = TRUE AND `hora_inicio` IS NULL AND `hora_fin` IS NULL) OR
    (`todo_el_dia` = FALSE AND `hora_inicio` IS NOT NULL AND `hora_fin` IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VERIFICACIÓN: Consultar las tablas creadas
-- ============================================

SELECT '✅ Tabla tipo_bloqueo creada' AS status;
SELECT * FROM tipo_bloqueo;

SELECT '✅ Tabla bloqueo_horarios creada' AS status;
DESCRIBE bloqueo_horarios;

-- ============================================
-- EJEMPLO DE BLOQUEO DE PRUEBA
-- ============================================

-- Descomentar para insertar un bloqueo de ejemplo:
/*
-- Bloqueo puntual: María no trabaja el 15 de marzo (todo el día)
INSERT INTO bloqueo_horarios (
  trabajador_id, tipo_bloqueo_id, fecha_inicio, fecha_fin,
  dia_semana, todo_el_dia, hora_inicio, hora_fin,
  motivo, user_id_crea
) VALUES (
  1, 1, '2026-03-15', '2026-03-15',
  NULL, TRUE, NULL, NULL,
  'Día libre por cumpleaños',
  1
);

-- Bloqueo recurrente: Juan tiene curso todos los martes de marzo de 8am-10am
INSERT INTO bloqueo_horarios (
  trabajador_id, tipo_bloqueo_id, fecha_inicio, fecha_fin,
  dia_semana, todo_el_dia, hora_inicio, hora_fin,
  motivo, user_id_crea
) VALUES (
  2, 2, '2026-03-01', '2026-03-31',
  2, FALSE, '08:00:00', '10:00:00',
  'Curso de especialización en terapia cognitiva',
  1
);
*/
