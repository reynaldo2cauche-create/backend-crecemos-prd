-- Migración para permitir paciente_id NULL en tablas citas e historial_citas
-- Esto permite crear reuniones clínicas sin asignar un paciente específico

-- 1. Modificar columna paciente_id en tabla citas para permitir valores NULL
ALTER TABLE `citas`
MODIFY COLUMN `paciente_id` INT(11) NULL;

-- 2. Modificar columna paciente_id en tabla historial_citas para permitir valores NULL
ALTER TABLE `historial_citas`
MODIFY COLUMN `paciente_id` INT(11) NULL;

-- Verificar los cambios
DESCRIBE `citas`;
DESCRIBE `historial_citas`;
