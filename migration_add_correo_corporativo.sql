-- Agregar columna correo_corporativo a la tabla trabajador_centro
-- Fecha: 2025-11-28
-- Descripción: Añade un campo para el correo corporativo del empleado

ALTER TABLE trabajador_centro
ADD COLUMN correo_corporativo VARCHAR(255) NULL;

-- Comentario sobre la columna (opcional, dependiendo de tu base de datos)
-- Para MySQL/MariaDB:
ALTER TABLE trabajador_centro
MODIFY COLUMN correo_corporativo VARCHAR(255) NULL COMMENT 'Correo electrónico corporativo del trabajador';

-- Verificar que la columna se haya agregado correctamente
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'trabajador_centro'
  AND COLUMN_NAME = 'correo_corporativo';
