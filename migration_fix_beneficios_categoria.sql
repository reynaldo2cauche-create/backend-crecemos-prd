-- =====================================================
-- Migración: Agregar foreign key de categoria_id en beneficios
-- Fecha: 2025-12-30
-- Descripción: Agrega la relación faltante entre beneficios y categorias_beneficios
-- =====================================================

-- Paso 1: Verificar que la tabla categorias_beneficios existe
-- (Si no existe, necesitas crearla primero)

-- Paso 2: Limpiar datos inconsistentes (opcional, por seguridad)
-- Poner NULL a categoria_id que no existen en categorias_beneficios
UPDATE beneficios
SET categoria_id = NULL
WHERE categoria_id IS NOT NULL
  AND categoria_id NOT IN (SELECT id FROM categorias_beneficios);

-- Paso 3: Agregar la foreign key
ALTER TABLE beneficios
ADD CONSTRAINT fk_beneficios_categoria
FOREIGN KEY (categoria_id)
REFERENCES categorias_beneficios(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Verificación
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    TABLE_NAME = 'beneficios'
    AND TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME IS NOT NULL;
