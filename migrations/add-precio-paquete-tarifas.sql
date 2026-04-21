-- =====================================================
-- Migration: Agregar precio_paquete a servicio_tarifa
-- Fecha: 2026-03-20
-- Descripción: Permite configurar precios especiales
--              cuando se compran múltiples sesiones
-- =====================================================

-- Agregar columna precio_paquete
ALTER TABLE servicio_tarifa
ADD COLUMN precio_paquete DECIMAL(10,2) NULL AFTER precio
COMMENT 'Precio unitario cuando se compra paquete (4+ sesiones)';

-- Nota: La cantidad mínima se calculará dinámicamente desde la tabla paquetes
-- No es necesario agregar campo cantidad_minima_paquete

-- Ejemplo de uso:
-- UPDATE servicio_tarifa SET precio_paquete = 50.00 WHERE servicio_id = 5 AND motivo_cita_id = 2;
-- Esto significa: precio normal S/60, precio paquete S/50 (desde 4+ sesiones)
