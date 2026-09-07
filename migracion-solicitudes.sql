-- =====================================================
-- MIGRACIÓN: Solicitudes de permisos y vacaciones (autoservicio + aprobación).
--
-- Flujo del Word "ASISTENCIA Y AUSENCIAS":
--   El terapeuta solicita un permiso/vacaciones desde su perfil (Mi asistencia).
--   RRHH revisa en un panel y APRUEBA o RECHAZA. Cada cambio queda en el historial.
--
-- El DESCUENTO DE SUELDO sigue siendo MANUAL: aprobar una solicitud NO genera
-- descuento automático. RRHH, si corresponde, registra la falta aparte en la
-- página de Faltas ya existente (tabla `faltas`). Esta migración NO toca planilla.
--
-- IDEMPOTENTE: se puede ejecutar varias veces sin duplicar ni romper nada.
-- Ejecutar sobre la BD ya seleccionada (USE tu_base;).
-- =====================================================

SET SQL_SAFE_UPDATES = 0;

-- 1) Solicitud de permiso / vacaciones.
CREATE TABLE IF NOT EXISTS `solicitud` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `trabajador_id` INT NOT NULL COMMENT 'Solicitante',
  `tipo` VARCHAR(40) NOT NULL COMMENT 'permiso_personal | permiso_medico | permiso_capacitacion | permiso_horas | vacaciones | otro',
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NULL COMMENT 'Para vacaciones / rango; NULL = un solo día',
  `hora_desde` TIME NULL COMMENT 'Permiso por horas',
  `hora_hasta` TIME NULL COMMENT 'Permiso por horas',
  `motivo` TEXT NULL,
  `archivo_url` VARCHAR(500) NULL COMMENT 'Documento adjunto',
  `estado` VARCHAR(20) NOT NULL DEFAULT 'pendiente' COMMENT 'pendiente | aprobado | rechazado',
  `anticipacion_dias` INT NULL COMMENT 'fecha_inicio - fecha_solicitud (informativo)',
  `fecha_solicitud` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `comentario_colaborador` TEXT NULL,
  `comentario_rrhh` TEXT NULL,
  `revisor_id` INT NULL COMMENT 'Trabajador (RRHH) que aprobó/rechazó',
  `fecha_revision` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_solicitud_trab` (`trabajador_id`),
  KEY `idx_solicitud_estado` (`estado`),
  KEY `idx_solicitud_fecha` (`fecha_inicio`),
  CONSTRAINT `fk_solicitud_trabajador` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajador_centro` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Historial / timeline de cada solicitud (creada, aprobada, rechazada, comentario).
CREATE TABLE IF NOT EXISTS `solicitud_historial` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `solicitud_id` INT NOT NULL,
  `accion` VARCHAR(40) NOT NULL COMMENT 'creada | aprobada | rechazada | comentario',
  `estado` VARCHAR(20) NULL COMMENT 'Estado resultante tras la acción',
  `comentario` TEXT NULL,
  `user_id` INT NULL COMMENT 'Quién realizó la acción',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hist_solicitud` (`solicitud_id`),
  CONSTRAINT `fk_hist_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitud` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
