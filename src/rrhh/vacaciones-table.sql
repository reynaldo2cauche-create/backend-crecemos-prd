-- Tabla de vacaciones simplificada para Centro Crecemos
CREATE TABLE `vacaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trabajador_id` int NOT NULL,
  `fechaSalida` date NOT NULL,
  `fechaRegreso` date NOT NULL,
  `diasTomados` int NOT NULL,
  `periodoAnio` int NOT NULL,
  `observaciones` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `trabajador_id` (`trabajador_id`),
  KEY `periodoAnio` (`periodoAnio`),
  KEY `fechaSalida` (`fechaSalida`),
  CONSTRAINT `vacaciones_ibfk_1` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajador_centro` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
