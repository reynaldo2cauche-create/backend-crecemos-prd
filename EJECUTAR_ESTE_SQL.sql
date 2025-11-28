-- =============================================
-- SCRIPT PARA AGREGAR CORREO CORPORATIVO
-- Copia y pega TODO este contenido en tu MySQL
-- =============================================

-- 1. Verificar si la columna ya existe
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'trabajador_centro'
  AND COLUMN_NAME = 'correo_corporativo';

-- 2. Si el resultado anterior está vacío (no existe), ejecuta esto:
ALTER TABLE trabajador_centro
ADD COLUMN correo_corporativo VARCHAR(255) NULL;

-- 3. Verificar que se agregó correctamente
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'trabajador_centro'
ORDER BY ORDINAL_POSITION;

-- 4. Ver la estructura completa de la tabla
DESCRIBE trabajador_centro;

-- 5. Probar insertar un valor (opcional - para testing)
-- UPDATE trabajador_centro
-- SET correo_corporativo = 'test@crecemos.com.pe'
-- WHERE id = 1;

-- 6. Verificar que se guardó (opcional - para testing)
-- SELECT id, nombres, apellidos, email, correo_corporativo
-- FROM trabajador_centro
-- WHERE id = 1;
