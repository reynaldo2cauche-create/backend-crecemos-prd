-- Script para agregar campos adicionales a la tabla trabajador_centro
-- Fecha: 2025-11-17
-- Descripción: Agrega campos de contacto, dirección y tallas

ALTER TABLE `trabajador_centro`
ADD COLUMN `telefono` VARCHAR(20) NULL COMMENT 'Teléfono personal' AFTER `email`,
ADD COLUMN `telefono_emergencia` VARCHAR(20) NULL COMMENT 'Teléfono de emergencia' AFTER `telefono`,
ADD COLUMN `contacto_emergencia` VARCHAR(100) NULL COMMENT 'Nombre del contacto de emergencia' AFTER `telefono_emergencia`,
ADD COLUMN `direccion` VARCHAR(255) NULL COMMENT 'Dirección completa' AFTER `contacto_emergencia`,
ADD COLUMN `distrito` VARCHAR(100) NULL COMMENT 'Distrito' AFTER `direccion`,
ADD COLUMN `provincia` VARCHAR(100) NULL COMMENT 'Provincia' AFTER `distrito`,
ADD COLUMN `departamento` VARCHAR(100) NULL COMMENT 'Departamento' AFTER `provincia`,
ADD COLUMN `talla_polo` VARCHAR(10) NULL COMMENT 'Talla de polo/camisa' AFTER `departamento`,
ADD COLUMN `talla_pantalon` VARCHAR(10) NULL COMMENT 'Talla de pantalón' AFTER `talla_polo`,
ADD COLUMN `talla_zapatos` VARCHAR(10) NULL COMMENT 'Talla de zapatos' AFTER `talla_pantalon`;

-- Verificar que las columnas se agregaron correctamente
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'trabajador_centro'
  AND COLUMN_NAME IN (
    'telefono',
    'telefono_emergencia',
    'contacto_emergencia',
    'direccion',
    'distrito',
    'provincia',
    'departamento',
    'talla_polo',
    'talla_pantalon',
    'talla_zapatos'
  )
ORDER BY ORDINAL_POSITION;
