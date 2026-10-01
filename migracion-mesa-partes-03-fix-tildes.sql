-- ============================================================================
-- MESA DE PARTES — fix de tildes (mojibake)
-- Los catálogos se importaron con el cliente en latin1 sobre tablas utf8mb4,
-- así que "ó" quedó como "Ã³". Esto reinterpreta los bytes correctamente.
--
-- Es idempotente para texto ASCII (filas sin tildes no cambian) pero NO lo
-- vuelvas a correr dos veces sobre las mismas filas ya corregidas.
-- ============================================================================

SET NAMES utf8mb4;

UPDATE mesa_partes_tipo
  SET nombre = CONVERT(CAST(CONVERT(nombre USING latin1) AS BINARY) USING utf8mb4);

UPDATE mesa_partes_tipo_evento
  SET nombre = CONVERT(CAST(CONVERT(nombre USING latin1) AS BINARY) USING utf8mb4);

UPDATE mesa_partes_estado
  SET nombre = CONVERT(CAST(CONVERT(nombre USING latin1) AS BINARY) USING utf8mb4);

-- Verificación
SELECT 'tipo' AS tabla, id, nombre FROM mesa_partes_tipo
UNION ALL SELECT 'tipo_evento', id, nombre FROM mesa_partes_tipo_evento
UNION ALL SELECT 'estado', id, nombre FROM mesa_partes_estado;

-- ============================================================================
-- FIN fix tildes
-- ============================================================================
