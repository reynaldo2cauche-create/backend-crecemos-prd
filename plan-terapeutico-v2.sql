-- =====================================================
-- PLAN TERAPÉUTICO v2  (scope = paciente + servicio)
-- Modelo de 2 niveles que reemplaza visualmente al planificador por bloques:
--   Objetivo GENERAL (área)  →  Objetivo ESPECÍFICO (máx 3)  →  Registro por sesión
-- Las SESIONES se siguen derivando de las citas reales (motivo de terapia),
-- igual que el módulo planificador actual. Aquí NO se duplican.
--
-- Coexiste con las tablas planificador_* (no se tocan). Si en el futuro se
-- desactiva el módulo viejo, esas tablas pueden archivarse aparte.
-- =====================================================

-- ──────────────────────────────────────────────────────────────────
-- MAESTRAS
-- ──────────────────────────────────────────────────────────────────

-- M1. Área de trabajo del plan (cuelga del servicio existente)
CREATE TABLE IF NOT EXISTS `plan_area` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `servicio_id` INT(11) NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `orden` INT(11) NOT NULL DEFAULT 0,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT `fk_planarea_servicio` FOREIGN KEY (`servicio_id`)
    REFERENCES `servicios`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_planarea` (`servicio_id`, `nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- M2. Frecuencia (etiqueta que se muestra; sin codigo, solo id + nombre)
CREATE TABLE IF NOT EXISTS `plan_frecuencia` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(80) NOT NULL,
  `orden` INT(11) NOT NULL DEFAULT 0,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY `uq_planfrec` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- M3. Estado del plan (el backend filtra por codigo)
CREATE TABLE IF NOT EXISTS `plan_estado` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(30) NOT NULL,
  `nombre` VARCHAR(60) NOT NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY `uq_planestado_cod` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- M4. Resultado de sesión (el front pinta/calcula según codigo; valor = puntaje)
CREATE TABLE IF NOT EXISTS `plan_resultado` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(30) NOT NULL,
  `nombre` VARCHAR(60) NOT NULL,
  `valor` INT(11) NOT NULL COMMENT '0/1/2 para promediar progreso',
  `color` VARCHAR(20) NULL,
  `orden` INT(11) NOT NULL DEFAULT 0,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY `uq_planresultado_cod` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────────────
-- TRANSACCIONALES
-- ──────────────────────────────────────────────────────────────────

-- T1. Cabecera del plan (1 por paciente + servicio)
CREATE TABLE IF NOT EXISTS `plan_terapeutico` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `paciente_id` INT(11) NOT NULL,
  `servicio_id` INT(11) NOT NULL,
  `terapeuta_id` INT(11) NULL COMMENT 'trabajador_centro dueño del plan',
  `estado_id` INT(11) NOT NULL,
  `metodologia` VARCHAR(200) NULL,
  `fecha_inicio` DATE NULL,
  `revision_cada` INT(11) NOT NULL DEFAULT 8 COMMENT 'revisión clínica cada N sesiones',
  `reunion_padres_cada` INT(11) NOT NULL DEFAULT 24 COMMENT 'reunión con padres cada N sesiones',
  `user_id_crea` INT(11) NULL,
  `user_id_actua` INT(11) NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_plant_paciente` FOREIGN KEY (`paciente_id`)
    REFERENCES `paciente`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_plant_servicio` FOREIGN KEY (`servicio_id`)
    REFERENCES `servicios`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_plant_terapeuta` FOREIGN KEY (`terapeuta_id`)
    REFERENCES `trabajador_centro`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_plant_estado` FOREIGN KEY (`estado_id`)
    REFERENCES `plan_estado`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY `uq_plant` (`paciente_id`, `servicio_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- T2. Objetivo general (área elegida) — máx 3 activos por plan (validado en backend)
CREATE TABLE IF NOT EXISTS `plan_objetivo_general` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `plan_id` INT(11) NOT NULL,
  `area_id` INT(11) NOT NULL,
  `frecuencia_id` INT(11) NULL,
  `descripcion` TEXT NULL,
  `plazo_sesiones` INT(11) NULL,
  `fecha_inicio` DATE NULL,
  `fecha_logro_est` DATE NULL,
  `orden` INT(11) NOT NULL DEFAULT 0,
  `user_id_crea` INT(11) NULL,
  `user_id_actua` INT(11) NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_og_plan` FOREIGN KEY (`plan_id`)
    REFERENCES `plan_terapeutico`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_og_area` FOREIGN KEY (`area_id`)
    REFERENCES `plan_area`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_og_frec` FOREIGN KEY (`frecuencia_id`)
    REFERENCES `plan_frecuencia`(`id`) ON DELETE SET NULL,
  INDEX `idx_og_plan` (`plan_id`, `flg_activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- T3. Objetivo específico — máx 3 por general (validado en backend)
CREATE TABLE IF NOT EXISTS `plan_objetivo_especifico` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `objetivo_general_id` INT(11) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `actividad_ejemplo` TEXT NULL,
  `materiales` TEXT NULL,
  `orden` INT(11) NOT NULL DEFAULT 0,
  `user_id_crea` INT(11) NULL,
  `user_id_actua` INT(11) NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_oe_general` FOREIGN KEY (`objetivo_general_id`)
    REFERENCES `plan_objetivo_general`(`id`) ON DELETE CASCADE,
  INDEX `idx_oe_general` (`objetivo_general_id`, `flg_activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- T4. Registro por sesión (lo que se llena en el tab Sesiones)
CREATE TABLE IF NOT EXISTS `plan_registro_sesion` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `objetivo_especifico_id` INT(11) NOT NULL,
  `resultado_id` INT(11) NULL COMMENT 'NULL = solo observación, sin resultado marcado',
  `numero_sesion` INT(11) NOT NULL COMMENT 'N° de sesión en la línea de tiempo del servicio (1..N)',
  `cita_id` INT(11) NULL COMMENT 'Cita real; NULL si la sesión está por agendar',
  `observaciones` TEXT NULL,
  `fecha` DATE NULL,
  `registrado_por` INT(11) NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reg_oe` FOREIGN KEY (`objetivo_especifico_id`)
    REFERENCES `plan_objetivo_especifico`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reg_res` FOREIGN KEY (`resultado_id`)
    REFERENCES `plan_resultado`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_reg_cita` FOREIGN KEY (`cita_id`)
    REFERENCES `citas`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_reg` (`objetivo_especifico_id`, `numero_sesion`),
  INDEX `idx_reg_cita` (`cita_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- T5. Asignación de objetivo específico a un BLOQUE de sesiones.
--     Un bloque = 4 sesiones. numero_bloque = FLOOR((numero_sesion - 1) / 4) + 1.
--     Las 4 sesiones del bloque comparten los objetivos asignados aquí;
--     el resultado se sigue guardando por sesión en plan_registro_sesion.
CREATE TABLE IF NOT EXISTS `plan_bloque_objetivo` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `plan_id` INT(11) NOT NULL,
  `objetivo_especifico_id` INT(11) NOT NULL,
  `numero_bloque` INT(11) NOT NULL COMMENT 'Bloque de 4 sesiones (1..N)',
  `user_id_crea` INT(11) NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bo_plan` FOREIGN KEY (`plan_id`)
    REFERENCES `plan_terapeutico`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bo_oe` FOREIGN KEY (`objetivo_especifico_id`)
    REFERENCES `plan_objetivo_especifico`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_bo` (`objetivo_especifico_id`, `numero_bloque`),
  INDEX `idx_bo_plan` (`plan_id`, `numero_bloque`, `flg_activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────────────
-- SEEDS — maestras
-- ──────────────────────────────────────────────────────────────────

INSERT INTO `plan_estado` (`codigo`, `nombre`) VALUES
('ACTIVO','Activo'), ('PAUSADO','Pausado'), ('CERRADO','Cerrado')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `plan_resultado` (`codigo`, `nombre`, `valor`, `color`, `orden`) VALUES
('NO_LOGRADO','No logrado',0,'red',1),
('EN_PROCESO','En proceso',1,'amber',2),
('LOGRADO','Logrado',2,'emerald',3)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `valor` = VALUES(`valor`), `color` = VALUES(`color`);

INSERT INTO `plan_frecuencia` (`nombre`, `orden`) VALUES
('1 vez por semana',1),
('2 veces por semana',2),
('3 veces por semana',3),
('1 vez cada 15 días',4),
('1 vez al mes',5)
ON DUPLICATE KEY UPDATE `orden` = VALUES(`orden`);

-- ──────────────────────────────────────────────────────────────────
-- SEEDS — áreas por servicio (servicio_id según catálogo real)
--   1 = Terapia de Lenguaje (infantil)
--   2 = Terapia Ocupacional
--   4 = Psicología (infantil)
--   7 = Psicoterapia Individual (adolescentes/adultos)
--   8 = Terapia de Pareja
--   9 = Terapia Familiar
--  10 = Terapia de Lenguaje (adultos)
-- ──────────────────────────────────────────────────────────────────
INSERT INTO `plan_area` (`servicio_id`, `nombre`, `orden`) VALUES
-- Psicología (4)
(4,'Área Emocional',1),(4,'Área Conductual',2),(4,'Área de Habilidades Sociales',3),
(4,'Área Cognitiva y Aprendizaje',4),(4,'Área de Adaptación Escolar',5),
-- Terapia de Pareja (8)
(8,'Área de Comunicación',1),(8,'Área Gestión de Conflictos',2),
(8,'Área Vínculo Afectivo',3),(8,'Área Proyecto de Vida en Pareja',4),
-- Terapia Familiar (9)
(9,'Comunicación Familiar',1),(9,'Dinámica y Organización Familiar',2),
(9,'Resolución de Conflictos',3),(9,'Crianza y Parentalidad',4),
-- Psicoterapia Individual (7)
(7,'Área Emocional y Conducta',1),(7,'Área Cognitiva',2),
(7,'Área Habilidades Sociales',3),(7,'Área Laboral',4),
-- Terapia Ocupacional (2)
(2,'Integración Sensorial',1),(2,'Motricidad Fina',2),(2,'Motricidad Gruesa',3),
(2,'Actividades de la Vida Diaria (AVD)',4),(2,'Funciones Ejecutivas',5),(2,'Juego',6),
-- Terapia de Lenguaje infantil (1)
(1,'Comprensión',1),(1,'Lenguaje Expresivo',2),(1,'Morfosintaxis',3),
(1,'Fonético-Fonológica',4),(1,'Pragmática',5),(1,'Motricidad Orofacial',6),
-- Terapia de Lenguaje adultos (10)
(10,'Comprensión',1),(10,'Lenguaje Expresivo',2),(10,'Morfosintaxis',3),
(10,'Fonético-Fonológica',4),(10,'Pragmática',5),(10,'Motricidad Orofacial',6)
ON DUPLICATE KEY UPDATE `orden` = VALUES(`orden`);
