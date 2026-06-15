-- =====================================================
-- MIGRACIÓN: campañas con fecha + hora (columnas DATETIME)
-- Cambia fecha_inicio / fecha_fin de DATE a DATETIME.
-- Los valores existentes (solo fecha) quedan a las 00:00:00. No se pierde data.
-- IDEMPOTENTE: re-ejecutable sin problema.
-- Ejecutar sobre la BD ya seleccionada (USE tu_base;).
-- =====================================================

-- 1) Pasar las fechas a DATETIME (incluyen hora).
ALTER TABLE campana MODIFY fecha_inicio DATETIME NOT NULL;
ALTER TABLE campana MODIFY fecha_fin DATETIME NOT NULL;

-- 2) Quitar columnas hora_inicio / hora_fin si se crearon en un intento anterior.
SET @x := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE table_schema = DATABASE() AND table_name = 'campana' AND column_name = 'hora_inicio');
SET @sql := IF(@x > 0, 'ALTER TABLE campana DROP COLUMN hora_inicio', 'SELECT ''hora_inicio no existe''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @x := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE table_schema = DATABASE() AND table_name = 'campana' AND column_name = 'hora_fin');
SET @sql := IF(@x > 0, 'ALTER TABLE campana DROP COLUMN hora_fin', 'SELECT ''hora_fin no existe''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
