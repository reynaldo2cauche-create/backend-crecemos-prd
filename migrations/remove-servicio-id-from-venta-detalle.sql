-- Migración: Eliminar servicio_id de venta_servicio_detalle
-- Fecha: 2026-03-23
-- Descripción: Como ya tenemos servicio_tarifa_id (que contiene servicio_id),
--              no necesitamos servicio_id duplicado en venta_servicio_detalle

-- Primero eliminar el índice si existe
ALTER TABLE venta_servicio_detalle DROP INDEX IF EXISTS idx_servicio_id;

-- Eliminar la foreign key si existe
ALTER TABLE venta_servicio_detalle DROP FOREIGN KEY IF EXISTS fk_venta_servicio_detalle_servicio;

-- Eliminar la columna servicio_id
ALTER TABLE venta_servicio_detalle DROP COLUMN servicio_id;

-- Nota: Ahora servicio_id se obtiene desde:
--       venta_servicio_detalle.servicio_tarifa_id -> servicio_tarifa.servicio_id
