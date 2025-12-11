-- ============================================================================
-- AGREGAR CAMPOS DE AUDITORÍA A TODAS LAS TABLAS
-- Sistema: Centro Crecemos
-- Fecha: 2025-12-11
-- ============================================================================

-- ============================================================================
-- TABLA: tipos_cita
-- ============================================================================
ALTER TABLE tipos_cita
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER activo,
ADD COLUMN IF NOT EXISTS user_actua_id INT NULL COMMENT 'Usuario que actualizó el registro' AFTER user_crea_id;


-- ============================================================================
-- TABLA: cita_encargados
-- ============================================================================
ALTER TABLE cita_encargados
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER email,
ADD COLUMN IF NOT EXISTS user_actua_id INT NULL COMMENT 'Usuario que actualizó el registro' AFTER user_crea_id;


-- ============================================================================
-- TABLA: cita_terapeutas
-- ============================================================================
ALTER TABLE cita_terapeutas
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER terapeuta_id,
ADD COLUMN IF NOT EXISTS user_actua_id INT NULL COMMENT 'Usuario que actualizó el registro' AFTER user_crea_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER user_actua_id,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;


-- ============================================================================
-- TABLA: cita_servicios
-- ============================================================================
ALTER TABLE cita_servicios
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER servicio_id,
ADD COLUMN IF NOT EXISTS user_actua_id INT NULL COMMENT 'Usuario que actualizó el registro' AFTER user_crea_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER user_actua_id,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;


-- ============================================================================
-- TABLA: historial_cita_terapeutas
-- ============================================================================
ALTER TABLE historial_cita_terapeutas
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER terapeuta_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER user_crea_id;


-- ============================================================================
-- TABLA: historial_cita_servicios
-- ============================================================================
ALTER TABLE historial_cita_servicios
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER servicio_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER user_crea_id;


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('tipos_cita', 'cita_encargados', 'cita_terapeutas', 'cita_servicios', 'historial_cita_terapeutas', 'historial_cita_servicios')
  AND COLUMN_NAME IN ('user_crea_id', 'user_actua_id', 'created_at', 'updated_at')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
/*
Todas las tablas ahora tendrán:
✅ user_crea_id - Usuario que creó el registro
✅ user_actua_id - Usuario que actualizó el registro (excepto tablas de historial)
✅ created_at - Fecha de creación (si no existía)
✅ updated_at - Fecha de actualización (si no existía, solo en tablas normales)

NOTA: Las tablas de historial solo tienen user_crea_id y created_at
      porque son registros inmutables (no se actualizan).
*/
