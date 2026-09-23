-- Vincula un bloqueo de agenda con la falta (registro manual de RRHH) que lo generó.
-- Al registrar una falta a un terapeuta se le bloquea la agenda esos días; con esta
-- columna el bloqueo se recrea al editar la falta y se elimina al borrarla.
-- Idempotente: solo agrega la columna si aún no existe.
SET @col_existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bloqueo_horarios'
    AND COLUMN_NAME = 'falta_id'
);
SET @sql = IF(@col_existe = 0,
  'ALTER TABLE bloqueo_horarios ADD COLUMN falta_id INT NULL AFTER motivo',
  'SELECT "columna falta_id ya existe" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
