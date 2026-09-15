-- Vincula un bloqueo de agenda con la solicitud de permiso que lo generó.
-- Permite borrar el bloqueo automáticamente cuando se elimina la solicitud.
-- Idempotente-ish: si la columna ya existe, el ADD COLUMN fallará; ejecutar solo una vez.
ALTER TABLE bloqueo_horarios
  ADD COLUMN solicitud_id INT NULL AFTER motivo;
