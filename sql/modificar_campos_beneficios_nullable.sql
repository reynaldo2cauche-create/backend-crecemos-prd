-- Modificar campos de la tabla beneficios para hacerlos nullable
-- Esto permite que los beneficios no necesiten tener estos campos obligatoriamente

ALTER TABLE `beneficios`
MODIFY COLUMN `codigo_beneficio` VARCHAR(20) NULL
COMMENT 'Código del beneficio (opcional)';

ALTER TABLE `beneficios`
MODIFY COLUMN `como_canjear` TEXT NULL
COMMENT 'Instrucciones de canje (opcional)';

ALTER TABLE `beneficios`
MODIFY COLUMN `fecha_vigencia` DATE NULL
COMMENT 'Fecha de vencimiento del beneficio (opcional)';
