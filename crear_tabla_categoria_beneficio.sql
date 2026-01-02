-- ================================================
-- CREAR TABLA CATEGORIA_BENEFICIO
-- ================================================

CREATE TABLE IF NOT EXISTS `categoria_beneficio` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- INSERTAR CATEGORÍAS INICIALES
-- ================================================

INSERT INTO `categoria_beneficio` (`nombre`, `descripcion`) VALUES
('Salud', 'Beneficios relacionados con servicios de salud'),
('Educación', 'Beneficios relacionados con servicios educativos'),
('Recreación', 'Beneficios relacionados con actividades recreativas'),
('Transporte', 'Beneficios relacionados con transporte'),
('Alimentación', 'Beneficios relacionados con alimentación'),
('Vestimenta', 'Beneficios relacionados con vestimenta y calzado'),
('Tecnología', 'Beneficios relacionados con productos tecnológicos'),
('Otros', 'Otros beneficios diversos');

-- ================================================
-- AGREGAR COLUMNA categoria_id A TABLA beneficios
-- ================================================

-- Primero verificamos si la columna existe
SET @dbname = DATABASE();
SET @tablename = 'beneficios';
SET @columnname = 'categoria_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column already exists' AS msg;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT NULL AFTER convenio_id;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ================================================
-- AGREGAR FOREIGN KEY DE categoria_id
-- ================================================

-- Verificamos si el foreign key ya existe
SET @fk_name = 'fk_beneficio_categoria';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND CONSTRAINT_NAME = @fk_name
  ) > 0,
  "SELECT 'Foreign key already exists' AS msg;",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fk_name, " FOREIGN KEY (categoria_id) REFERENCES categoria_beneficio(id) ON DELETE SET NULL;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ================================================
-- MIGRAR DATOS EXISTENTES (opcional)
-- ================================================

-- Actualizar beneficios existentes con categoría basada en el campo 'categoria' (si existe como texto)
UPDATE beneficios b
INNER JOIN categoria_beneficio cb ON cb.nombre = b.categoria
SET b.categoria_id = cb.id
WHERE b.categoria IS NOT NULL AND b.categoria != '';

-- Si quieres, puedes eliminar la columna 'categoria' varchar después de migrar:
-- ALTER TABLE beneficios DROP COLUMN categoria;

-- ================================================
-- VERIFICACIÓN
-- ================================================

-- Ver las categorías creadas
SELECT * FROM categoria_beneficio;

-- Ver la estructura de la tabla beneficios
DESCRIBE beneficios;

-- Ver beneficios con sus categorías
SELECT
    b.id,
    b.nombre AS beneficio_nombre,
    b.descripcion AS beneficio_descripcion,
    cb.nombre AS categoria_nombre,
    b.convenio_id
FROM beneficios b
LEFT JOIN categoria_beneficio cb ON b.categoria_id = cb.id;
