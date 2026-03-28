-- Migración para eliminar campos de texto plano de indicación terapéutica
-- Fecha: 2026-03-05
-- Descripción: Elimina las columnas referencias_texto, recomendaciones_texto y conclusiones
--              ya que ahora tanto infantil como adultos usan el mismo sistema de checkboxes

-- Eliminar las columnas que ya no se usan
ALTER TABLE indicacion_terapeutica
DROP COLUMN IF EXISTS referencias_texto,
DROP COLUMN IF EXISTS recomendaciones_texto,
DROP COLUMN IF EXISTS conclusiones;
