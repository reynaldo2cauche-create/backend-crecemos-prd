-- Migración: Crear tabla de configuración de popup
-- Fecha: 2024-11-21
-- Descripción: Tabla para gestionar el popup promocional del sitio web

CREATE TABLE IF NOT EXISTS `popup_configuracion` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `activo` TINYINT(1) NOT NULL DEFAULT 0,
  `imagen_url` VARCHAR(500) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar registro inicial
INSERT INTO `popup_configuracion` (`activo`, `imagen_url`) VALUES (0, NULL);
