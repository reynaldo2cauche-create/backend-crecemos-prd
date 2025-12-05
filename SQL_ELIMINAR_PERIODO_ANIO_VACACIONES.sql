-- =====================================================
-- ELIMINAR COLUMNA periodo_anio DE TABLA vacaciones
-- =====================================================
-- Descripción: Elimina el campo periodo_anio ya que es redundante.
--              Con fecha_inicio y fecha_fin es suficiente para filtrar.
-- =====================================================

USE centro_crecemos;

-- Verificar datos actuales
SELECT id, empleado_id, fecha_inicio, fecha_fin, periodo_anio, dias_tomados
FROM vacaciones
ORDER BY fecha_inicio DESC
LIMIT 10;

-- Eliminar la columna periodo_anio
ALTER TABLE vacaciones
DROP COLUMN periodo_anio;

-- Verificar que se eliminó correctamente
DESCRIBE vacaciones;

-- Verificar datos después del cambio
SELECT id, empleado_id, fecha_inicio, fecha_fin, dias_tomados
FROM vacaciones
ORDER BY fecha_inicio DESC
LIMIT 10;
