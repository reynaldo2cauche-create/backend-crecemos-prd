-- Migración: Agregar servicio_tarifa_id a venta_servicio_detalle
-- Fecha: 2026-03-23
-- Descripción: Agrega la columna servicio_tarifa_id para poder obtener el motivo de cita
--              (terapia, evaluación, entrevista de padres, etc.) desde servicio_tarifa

-- Agregar la columna servicio_tarifa_id
ALTER TABLE venta_servicio_detalle
ADD COLUMN servicio_tarifa_id INT NULL AFTER servicio_id;

-- Agregar la foreign key
ALTER TABLE venta_servicio_detalle
ADD CONSTRAINT fk_venta_servicio_detalle_servicio_tarifa
FOREIGN KEY (servicio_tarifa_id) REFERENCES servicio_tarifa(id);

-- Agregar índice para mejorar performance en las consultas
ALTER TABLE venta_servicio_detalle
ADD INDEX idx_servicio_tarifa_id (servicio_tarifa_id);

-- Nota: Esta columna puede ser NULL porque las ventas antiguas no tienen este dato
--       Para ventas nuevas, deberá ser obligatorio desde el frontend
--       servicio_tarifa ya contiene: servicio_id + motivo_cita_id + precio
