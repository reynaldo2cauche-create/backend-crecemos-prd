-- =============================================
-- ELIMINAR COLUMNA ROL (ya no se usa, solo rol_id)
-- =============================================

USE crecemos_website;

-- Verificar que la columna existe
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'trabajador_centro'
AND COLUMN_NAME = 'rol';

-- Eliminar la columna rol
ALTER TABLE trabajador_centro DROP COLUMN rol;

-- Verificar que se eliminó
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'trabajador_centro'
AND COLUMN_NAME = 'rol';

-- Debe estar vacío (0 results)
