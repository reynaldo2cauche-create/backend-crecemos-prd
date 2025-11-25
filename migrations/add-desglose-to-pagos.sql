-- Agregar columnas de desglose a la tabla pagos
-- Fecha: 2025-11-25
-- Descripción: Agregar montoSueldo y montoGratificacion para desglose de pagos con gratificación

ALTER TABLE pagos
ADD COLUMN montoSueldo DECIMAL(10, 2) NULL COMMENT 'Desglose: monto del sueldo base',
ADD COLUMN montoGratificacion DECIMAL(10, 2) NULL COMMENT 'Desglose: monto de gratificación (25%)';

-- Verificar las columnas agregadas
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'pagos'
AND TABLE_SCHEMA = 'crecemos_website'
AND COLUMN_NAME IN ('montoSueldo', 'montoGratificacion', 'mes', 'anio');

-- Mostrar estructura completa de la tabla
DESCRIBE pagos;
