-- =====================================================
-- MIGRACIÓN: Agregar información profesional al Staff
-- Fecha: 2025-01-07
-- Descripción: Agrega tablas para formación académica,
--              especializaciones y mejora el perfil de staff
-- =====================================================

-- 1. Agregar campos adicionales a la tabla staff
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS titulo_profesional VARCHAR(255) NULL COMMENT 'Ej: Licenciada en Psicología' AFTER descripcion_especialidad,
ADD COLUMN IF NOT EXISTS universidad_principal VARCHAR(255) NULL COMMENT 'Universidad de donde se graduó' AFTER titulo_profesional,
ADD COLUMN IF NOT EXISTS anio_graduacion INT NULL COMMENT 'Año de graduación' AFTER universidad_principal,
ADD COLUMN IF NOT EXISTS numero_colegiatura VARCHAR(50) NULL COMMENT 'Número de colegiatura profesional' AFTER anio_graduacion,
ADD COLUMN IF NOT EXISTS biografia TEXT NULL COMMENT 'Biografía o presentación personal del terapeuta' AFTER numero_colegiatura,

-- 2. Crear tabla para FORMACIÓN ACADÉMICA (Pregrado, Maestría, Doctorado)
CREATE TABLE IF NOT EXISTS staff_formacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL COMMENT 'ID del staff',
  tipo_formacion ENUM('Licenciatura', 'Bachiller', 'Maestría', 'Doctorado', 'Posgrado', 'Otro') NOT NULL DEFAULT 'Licenciatura',
  titulo VARCHAR(255) NOT NULL COMMENT 'Ej: Licenciada en Psicología Clínica',
  institucion VARCHAR(255) NOT NULL COMMENT 'Universidad o institución',
  anio_inicio INT NULL COMMENT 'Año de inicio',
  anio_fin INT NULL COMMENT 'Año de culminación',
  en_curso TINYINT(1) DEFAULT 0 COMMENT '1 = En curso, 0 = Finalizado',
  descripcion TEXT NULL COMMENT 'Detalles adicionales',
  orden INT DEFAULT 1 COMMENT 'Orden de visualización',
  activo TINYINT(1) DEFAULT 1,
  user_id_crea INT NULL,
  user_id_actua INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  INDEX idx_staff_formacion_staff (staff_id),
  INDEX idx_staff_formacion_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Formación académica del personal (pregrado, posgrado, etc.)';

-- 3. Crear tabla para ESPECIALIZACIONES, DIPLOMADOS y CURSOS
CREATE TABLE IF NOT EXISTS staff_especializacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL COMMENT 'ID del staff',
  tipo_especializacion ENUM('Especialización', 'Diplomado', 'Curso', 'Certificación', 'Taller', 'Seminario', 'Otro') NOT NULL DEFAULT 'Curso',
  nombre VARCHAR(255) NOT NULL COMMENT 'Nombre de la especialización o curso',
  institucion VARCHAR(255) NOT NULL COMMENT 'Institución que otorga la especialización',
  anio_inicio INT NULL COMMENT 'Año de inicio',
  anio_fin INT NULL COMMENT 'Año de culminación',
  en_curso TINYINT(1) DEFAULT 0 COMMENT '1 = En curso, 0 = Finalizado',
  duracion_horas INT NULL COMMENT 'Duración en horas académicas',
  certificado_url VARCHAR(255) NULL COMMENT 'URL del certificado (si aplica)',
  descripcion TEXT NULL COMMENT 'Detalles adicionales',
  orden INT DEFAULT 1 COMMENT 'Orden de visualización',
  activo TINYINT(1) DEFAULT 1,
  user_id_crea INT NULL,
  user_id_actualiza INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  INDEX idx_staff_especializacion_staff (staff_id),
  INDEX idx_staff_especializacion_tipo (tipo_especializacion),
  INDEX idx_staff_especializacion_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Especializaciones, diplomados, cursos y certificaciones del personal';

-- 4. Crear tabla para EXPERIENCIA LABORAL (opcional pero útil)
CREATE TABLE IF NOT EXISTS staff_experiencia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL COMMENT 'ID del staff',
  cargo VARCHAR(255) NOT NULL COMMENT 'Cargo o posición',
  institucion VARCHAR(255) NOT NULL COMMENT 'Nombre de la institución o empresa',
  descripcion TEXT NULL COMMENT 'Descripción de funciones y logros',
  fecha_inicio DATE NULL COMMENT 'Fecha de inicio',
  fecha_fin DATE NULL COMMENT 'Fecha de fin',
  actualmente TINYINT(1) DEFAULT 0 COMMENT '1 = Trabajo actual, 0 = Trabajo pasado',
  orden INT DEFAULT 1 COMMENT 'Orden de visualización',
  activo TINYINT(1) DEFAULT 1,
  user_id_crea INT NULL,
  user_id_actualiza INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  INDEX idx_staff_experiencia_staff (staff_id),
  INDEX idx_staff_experiencia_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Experiencia laboral del personal';

-- =====================================================
-- DATOS DE EJEMPLO: Giselle Gianina Burgos Del Rosario
-- =====================================================

-- Insertar en staff (asumiendo que trabajador_id ya existe)
-- NOTA: Ajusta el trabajador_id según tu base de datos
/*
INSERT INTO staff (trabajador_id, descripcion_especialidad, titulo_profesional, universidad_principal, anio_graduacion, numero_colegiatura, biografia, orden, activo)
VALUES (
  1, -- Cambiar por el ID del trabajador correspondiente
  'Psicología Clínica – Infantil, Adolescente y Adulto',
  'Licenciada en Psicología – Especialidad Clínica',
  'Universidad Peruana de Ciencias Aplicadas (UPC)',
  2018,
  'CPP-12345', -- Número de colegiatura
  'Psicóloga clínica especializada en terapia cognitivo conductual con amplia experiencia en atención de niños, adolescentes y adultos.',
  1,
  1
);
*/

-- Obtener el ID del staff recién insertado para los siguientes inserts
-- SET @staff_id = LAST_INSERT_ID();

-- Insertar FORMACIÓN ACADÉMICA
/*
INSERT INTO staff_formacion (staff_id, tipo_formacion, titulo, institucion, anio_inicio, anio_fin, en_curso, orden, activo)
VALUES
(@staff_id, 'Licenciatura', 'Licenciada en Psicología – Especialidad Clínica', 'Universidad Peruana de Ciencias Aplicadas (UPC)', 2014, 2018, 0, 1, 1);
*/

-- Insertar ESPECIALIZACIONES y CURSOS
/*
INSERT INTO staff_especializacion (staff_id, tipo_especializacion, nombre, institucion, anio_inicio, anio_fin, en_curso, descripcion, orden, activo)
VALUES
-- Especialización en Psicoterapia Cognitivo Conductual
(@staff_id, 'Especialización', 'Especialidad en Psicoterapia Cognitivo Conductual de Beck', 'Instituto de Psicoterapia Cognitivo Conductual Beck, en convenio con la Universidad ÚNICA de Ica', 2024, NULL, 1, 'Estado: En curso', 1, 1),

-- Curso DBT
(@staff_id, 'Curso', 'Habilidades en DBT para el tratamiento del Trastorno Límite de la Personalidad', 'CEAS Perú', 2024, 2024, 0, NULL, 2, 1),

-- Curso Activación Conductual
(@staff_id, 'Curso', 'Activación Conductual para la Depresión', 'CEAS Perú', 2024, 2024, 0, NULL, 3, 1),

-- Diplomado en Terapia Sistémica
(@staff_id, 'Diplomado', 'Diplomado en Terapia Sistémica: Familiar y de Pareja', 'Instituto Multidisciplinario de Crecimiento Profesional (IMCEPRO), en convenio con la Universidad de Piura', 2025, 2026, 1, 'Estado: En curso', 4, 1);
*/

-- =====================================================
-- CONSULTAS ÚTILES PARA VERIFICAR
-- =====================================================

-- Ver toda la información de un terapeuta
/*
SELECT
  s.id,
  t.nombres,
  t.apellidos,
  s.titulo_profesional,
  s.universidad_principal,
  s.anio_graduacion,
  s.numero_colegiatura,
  s.biografia
FROM staff s
INNER JOIN trabajador_centro t ON s.trabajador_id = t.id
WHERE s.activo = 1;

-- Ver formación académica
SELECT
  sf.tipo_formacion,
  sf.titulo,
  sf.institucion,
  sf.anio_inicio,
  sf.anio_fin,
  sf.en_curso
FROM staff_formacion sf
WHERE sf.staff_id = @staff_id AND sf.activo = 1
ORDER BY sf.orden;

-- Ver especializaciones y cursos
SELECT
  se.tipo_especializacion,
  se.nombre,
  se.institucion,
  se.anio_inicio,
  se.anio_fin,
  se.en_curso
FROM staff_especializacion se
WHERE se.staff_id = @staff_id AND se.activo = 1
ORDER BY se.orden;
*/

-- =====================================================
-- ROLLBACK (si necesitas revertir los cambios)
-- =====================================================
/*
DROP TABLE IF EXISTS staff_experiencia;
DROP TABLE IF EXISTS staff_especializacion;
DROP TABLE IF EXISTS staff_formacion;

ALTER TABLE staff
DROP COLUMN IF EXISTS email_profesional,
DROP COLUMN IF EXISTS linkedin,
DROP COLUMN IF EXISTS biografia,
DROP COLUMN IF EXISTS numero_colegiatura,
DROP COLUMN IF EXISTS anio_graduacion,
DROP COLUMN IF EXISTS universidad_principal,
DROP COLUMN IF EXISTS titulo_profesional;
*/
