-- ===============================================
-- MIGRACIÓN: SOFT DELETE PARA CITAS
-- Fecha: 2026-01-20
-- Descripción: Agrega campo flg_activo para implementar soft delete
--              y modifica el foreign key CASCADE en historial_citas
-- ===============================================

-- 1. Agregar campo flg_activo a la tabla citas
-- ===============================================
ALTER TABLE citas
ADD COLUMN flg_activo TINYINT(1) DEFAULT 1
COMMENT 'Estado: 1=Activo, 0=Eliminado (Soft Delete)';

-- Actualizar todas las citas existentes como activas
UPDATE citas SET flg_activo = 1 WHERE flg_activo IS NULL;

-- Crear índice para mejorar performance en consultas
CREATE INDEX idx_flg_activo ON citas(flg_activo);

-- ===============================================
-- 2. Modificar foreign key CASCADE en historial_citas
-- ===============================================

-- Eliminar el constraint actual que tiene ON DELETE CASCADE
ALTER TABLE historial_citas DROP FOREIGN KEY historial_citas_ibfk_1;

-- Hacer que cita_id pueda ser NULL (para cuando se elimine físicamente una cita)
ALTER TABLE historial_citas MODIFY COLUMN cita_id INT NULL COMMENT 'ID de la cita relacionada';

-- Agregar el nuevo constraint con ON DELETE SET NULL
ALTER TABLE historial_citas
ADD CONSTRAINT historial_citas_ibfk_1
FOREIGN KEY (cita_id) REFERENCES citas(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- ===============================================
-- NOTAS IMPORTANTES:
-- ===============================================
-- ✅ Ahora las citas NO se eliminan físicamente, solo se marca flg_activo = 0
-- ✅ El historial se mantiene intacto cuando se "elimina" una cita
-- ✅ En la agenda solo se muestran citas con flg_activo = 1
-- ✅ El historial muestra el registro de tipo 'DELETE' cuando se marca flg_activo = 0
-- ✅ Si algún día se elimina físicamente una cita, el historial mantiene el registro
--    pero cita_id se pone en NULL (poco probable que pase)

-- ===============================================
-- VERIFICACIÓN:
-- ===============================================
-- Verificar que el campo se creó correctamente:
-- SHOW COLUMNS FROM citas LIKE 'flg_activo';

-- Verificar el nuevo constraint:
-- SHOW CREATE TABLE historial_citas;

-- Ver citas activas:
-- SELECT COUNT(*) FROM citas WHERE flg_activo = 1;

-- Ver citas eliminadas:
-- SELECT COUNT(*) FROM citas WHERE flg_activo = 0;
