-- =====================================================
-- MIGRACIÓN: Faltas / permisos y descuento de días no laborados.
--
-- Registra faltas/permisos por empleado y descuenta el día del sueldo fijo
-- según el horario del trabajador (qué días de la semana labora). El pago es
-- mensual, por eso el divisor son los días que realmente trabaja en ESE mes:
--   valor día = sueldo_base / (días laborables del mes calendario según su horario)
--
-- IDEMPOTENTE: se puede ejecutar varias veces sin duplicar ni romper nada.
-- Ejecutar sobre la BD ya seleccionada (USE tu_base;).
-- =====================================================

SET SQL_SAFE_UPDATES = 0;

-- 1) Horario del empleado: qué días de la semana labora (CSV ISO 1=Lunes..7=Domingo).
SET @x := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE table_schema = DATABASE()
             AND table_name = 'trabajador_centro'
             AND column_name = 'dias_laborables');
SET @sql := IF(@x = 0,
  'ALTER TABLE trabajador_centro ADD COLUMN dias_laborables VARCHAR(20) NULL COMMENT ''Días que labora (CSV ISO 1=Lun..7=Dom)'' AFTER sueldo_base',
  'SELECT ''dias_laborables ya existe''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) Total descontado por faltas en un pago (informativo).
SET @x := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE table_schema = DATABASE()
             AND table_name = 'pagos'
             AND column_name = 'monto_descuento');
SET @sql := IF(@x = 0,
  'ALTER TABLE pagos ADD COLUMN monto_descuento DECIMAL(10,2) NULL COMMENT ''Total descontado por faltas'' AFTER monto_gratificacion',
  'SELECT ''pagos.monto_descuento ya existe''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 3) Catálogo de tipos de falta.
CREATE TABLE IF NOT EXISTS `tipo_falta` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `descuenta` TINYINT(1) NOT NULL DEFAULT 1,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tipo_falta_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed de tipos (no duplica por el UNIQUE de codigo).
INSERT INTO `tipo_falta` (`codigo`, `nombre`, `descuenta`) VALUES
  ('FALTA_INJUSTIFICADA', 'Falta injustificada', 1),
  ('PERMISO_SIN_GOCE',    'Permiso sin goce de haber', 1),
  ('PERMISO_CON_GOCE',    'Permiso con goce de haber', 0),
  ('LICENCIA_MEDICA',     'Licencia médica / descanso médico', 0)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- 4) Faltas / permisos.
CREATE TABLE IF NOT EXISTS `faltas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `trabajador_id` INT NOT NULL,
  `tipo_falta_id` INT NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `descuenta` TINYINT(1) NOT NULL DEFAULT 1,
  `dias` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `valor_dia` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `monto_descuento` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `mes_id` INT NOT NULL,
  `anio` INT NOT NULL,
  `pago_id` INT NULL,
  `observaciones` TEXT NULL,
  `user_id_crea` INT NULL,
  `user_id_actua` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faltas_trab_mes` (`trabajador_id`, `mes_id`, `anio`),
  KEY `fk_faltas_tipo` (`tipo_falta_id`),
  KEY `fk_faltas_mes` (`mes_id`),
  KEY `fk_faltas_pago` (`pago_id`),
  CONSTRAINT `fk_faltas_trabajador` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajador_centro` (`id`),
  CONSTRAINT `fk_faltas_tipo` FOREIGN KEY (`tipo_falta_id`) REFERENCES `tipo_falta` (`id`),
  CONSTRAINT `fk_faltas_mes` FOREIGN KEY (`mes_id`) REFERENCES `mes` (`id`),
  CONSTRAINT `fk_faltas_pago` FOREIGN KEY (`pago_id`) REFERENCES `pagos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
