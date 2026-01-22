-- ============================================
-- MIGRACIÓN: Procesos Legales Infantiles
-- ============================================

-- 1. Crear tabla procesos_legales_infantiles
CREATE TABLE IF NOT EXISTS procesos_legales_infantiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_activo (activo),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insertar datos iniciales (ajusta según tus necesidades)
INSERT INTO procesos_legales_infantiles (nombre, descripcion, activo) VALUES
('Tenencia', 'Proceso de tenencia del menor', 1),
('Tutela', 'Proceso de tutela legal', 1),
('Alimentos', 'Proceso de pensión alimenticia', 1),
('Adopción', 'Proceso de adopción', 1),
('Régimen de visitas', 'Proceso de régimen de visitas', 1),
('Violencia familiar', 'Proceso por violencia familiar', 1),
('Otro', 'Otro tipo de proceso legal', 1);

-- 3. Agregar columna proceso_legal_infantil_id a paciente_responsable
ALTER TABLE paciente_responsable
ADD COLUMN proceso_legal_infantil_id INT NULL AFTER tiene_proceso_legal,
ADD CONSTRAINT fk_paciente_responsable_proceso_legal
    FOREIGN KEY (proceso_legal_infantil_id)
    REFERENCES procesos_legales_infantiles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- 4. Crear índice para mejorar performance
CREATE INDEX idx_proceso_legal_infantil ON paciente_responsable(proceso_legal_infantil_id);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Verificar estructura de la tabla
DESCRIBE procesos_legales_infantiles;

-- Verificar datos insertados
SELECT * FROM procesos_legales_infantiles;

-- Verificar nueva columna en paciente_responsable
DESCRIBE paciente_responsable;

-- Verificar foreign key
SELECT
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'paciente_responsable'
AND CONSTRAINT_NAME = 'fk_paciente_responsable_proceso_legal';
