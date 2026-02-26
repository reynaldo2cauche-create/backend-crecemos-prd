-- ================================================
-- AGREGAR CÓDIGO DE COMPROBANTE A VENTAS
-- ================================================
-- Autor: Sistema
-- Fecha: 2024
-- Descripción: Agrega columna codigo_comprobante a las tablas de ventas
--              para identificar Notas de Venta, Boletas y Facturas
-- Formato:
--   - Nota de Venta: NV-0001, NV-0002, ...
--   - Boleta:        B001-00001, B001-00002, ... (formato SUNAT)
--   - Factura:       F001-00001, F001-00002, ... (formato SUNAT)
-- ================================================

-- 1. Agregar columna a venta_producto (después de id)
ALTER TABLE venta_producto
ADD COLUMN codigo_comprobante VARCHAR(20) NULL COMMENT 'Código del comprobante (NV-0001, B001-00001, F001-00001)'
AFTER id;

-- 2. Agregar columna a venta_servicio (después de id)
ALTER TABLE venta_servicio
ADD COLUMN codigo_comprobante VARCHAR(20) NULL COMMENT 'Código del comprobante (NV-0001, B001-00001, F001-00001)'
AFTER id;

-- 3. Crear índices para búsquedas rápidas
CREATE INDEX idx_venta_producto_codigo ON venta_producto(codigo_comprobante);
CREATE INDEX idx_venta_servicio_codigo ON venta_servicio(codigo_comprobante);

-- 4. Agregar constraint UNIQUE para evitar duplicados
ALTER TABLE venta_producto ADD CONSTRAINT uk_venta_producto_codigo UNIQUE (codigo_comprobante);
ALTER TABLE venta_servicio ADD CONSTRAINT uk_venta_servicio_codigo UNIQUE (codigo_comprobante);

-- ================================================
-- GENERAR CÓDIGOS PARA VENTAS EXISTENTES (opcional)
-- ================================================
-- Si ya tienes ventas existentes sin código, puedes ejecutar esto:

-- Para venta_producto
SET @contador_nv_producto := 0;
SET @contador_boleta_producto := 0;
SET @contador_factura_producto := 0;

UPDATE venta_producto v
LEFT JOIN tipo_comprobante tc ON v.tipo_comprobante_id = tc.id
SET v.codigo_comprobante = CASE
    -- Nota de Venta (id=1)
    WHEN tc.id = 1 THEN CONCAT('NV-', LPAD((@contador_nv_producto := @contador_nv_producto + 1), 4, '0'))
    -- Boleta (id=2)
    WHEN tc.id = 2 THEN CONCAT('B001-', LPAD((@contador_boleta_producto := @contador_boleta_producto + 1), 5, '0'))
    -- Factura (id=3)
    WHEN tc.id = 3 THEN CONCAT('F001-', LPAD((@contador_factura_producto := @contador_factura_producto + 1), 5, '0'))
    ELSE NULL
END
WHERE v.codigo_comprobante IS NULL
ORDER BY v.fecha_venta ASC, v.id ASC;

-- Para venta_servicio
SET @contador_nv_servicio := 0;
SET @contador_boleta_servicio := 0;
SET @contador_factura_servicio := 0;

UPDATE venta_servicio v
LEFT JOIN tipo_comprobante tc ON v.tipo_comprobante_id = tc.id
SET v.codigo_comprobante = CASE
    -- Nota de Venta (id=1)
    WHEN tc.id = 1 THEN CONCAT('NV-', LPAD((@contador_nv_servicio := @contador_nv_servicio + 1), 4, '0'))
    -- Boleta (id=2)
    WHEN tc.id = 2 THEN CONCAT('B001-', LPAD((@contador_boleta_servicio := @contador_boleta_servicio + 1), 5, '0'))
    -- Factura (id=3)
    WHEN tc.id = 3 THEN CONCAT('F001-', LPAD((@contador_factura_servicio := @contador_factura_servicio + 1), 5, '0'))
    ELSE NULL
END
WHERE v.codigo_comprobante IS NULL
ORDER BY v.fecha_venta ASC, v.id ASC;

-- ================================================
-- VERIFICAR RESULTADOS
-- ================================================
SELECT 'Ventas de productos con código:' AS info, COUNT(*) AS total
FROM venta_producto WHERE codigo_comprobante IS NOT NULL;

SELECT 'Ventas de servicios con código:' AS info, COUNT(*) AS total
FROM venta_servicio WHERE codigo_comprobante IS NOT NULL;

-- Ver algunos ejemplos
SELECT id, codigo_comprobante, fecha_venta, tipo_comprobante_id, total
FROM venta_producto
ORDER BY fecha_venta DESC LIMIT 10;

SELECT id, codigo_comprobante, fecha_venta, tipo_comprobante_id, total
FROM venta_servicio
ORDER BY fecha_venta DESC LIMIT 10;
