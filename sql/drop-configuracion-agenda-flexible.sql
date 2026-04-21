-- Eliminar tabla de configuración de agenda flexible (funcionalidad descontinuada)
-- Esta tabla ya no se utiliza, se reemplazó con ajuste manual de horarios

-- Primero eliminar el índice en la tabla citas si existe
DROP INDEX IF EXISTS idx_citas_horario_fijo ON citas;

-- Eliminar la columna horario_fijo de la tabla citas si existe
ALTER TABLE citas DROP COLUMN IF EXISTS horario_fijo;

-- Eliminar la tabla de configuración
DROP TABLE IF EXISTS configuracion_agenda_flexible;
