-- Agregar columnas mes y anio a la tabla pagos
-- Fecha: 2025-11-25
-- Descripción: Agregar soporte para pagos mensuales regulares

ALTER TABLE pagos
ADD COLUMN mes VARCHAR(255) NULL COMMENT 'Mes del pago (enero, febrero, etc.)',
ADD COLUMN anio INT NULL COMMENT 'Año del pago (2024, 2025, etc.)';

-- Verificar las columnas agregadas
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'pagos'
AND TABLE_SCHEMA = 'crecemos_website'
AND COLUMN_NAME IN ('mes', 'anio');
