-- Script para agregar columna correo_corporativo
-- Ejecuta esto en tu base de datos

-- Primero verificamos si la columna ya existe
SELECT COUNT(*) as columna_existe
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'trabajador_centro'
  AND COLUMN_NAME = 'correo_corporativo';

-- Si el resultado es 0, ejecuta este ALTER TABLE:
ALTER TABLE trabajador_centro
ADD COLUMN correo_corporativo VARCHAR(255) NULL;

-- Verificar que se agregó correctamente
DESCRIBE trabajador_centro;
