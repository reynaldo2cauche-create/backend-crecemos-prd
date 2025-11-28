-- =============================================
-- SCRIPT PARA VERIFICAR Y AGREGAR COLUMNA
-- Ejecuta TODO esto en tu MySQL
-- =============================================

-- 1. Selecciona tu base de datos
USE crecemos_website;

-- 2. Verificar si la columna existe
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'crecemos_website'
  AND TABLE_NAME = 'trabajador_centro'
  AND COLUMN_NAME = 'correo_corporativo';

-- 3. Si el resultado anterior está VACÍO, ejecuta esto:
-- (Si ya existe, NO ejecutes esta línea)
ALTER TABLE trabajador_centro
ADD COLUMN IF NOT EXISTS correo_corporativo VARCHAR(255) NULL;

-- 4. Verificar TODAS las columnas de la tabla
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'crecemos_website'
  AND TABLE_NAME = 'trabajador_centro'
ORDER BY ORDINAL_POSITION;

-- 5. Ver la estructura de la tabla
DESCRIBE trabajador_centro;
