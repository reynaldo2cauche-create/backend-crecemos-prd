-- Script para eliminar columnas duplicadas (varchar) y dejar solo las FK
-- Las columnas 'rol', 'cargo' y 'especialidad' (varchar) son redundantes
-- porque ya tenemos rol_id y especialidad_id con las relaciones

ALTER TABLE `trabajador_centro` DROP COLUMN `rol`;
ALTER TABLE `trabajador_centro` DROP COLUMN `especialidad`;

-- Verificar que las columnas se eliminaron
DESCRIBE trabajador_centro;
