-- Agregar campo para verificar si el paciente firmó el documento de consentimiento
ALTER TABLE `citas`
ADD COLUMN `firma_documento` TINYINT(1) DEFAULT 0 COMMENT 'Indica si el paciente firmó el documento de consentimiento (0=No, 1=Sí)'
AFTER `nota`;

-- Índice para búsquedas por firma
CREATE INDEX `idx_firma_documento` ON `citas` (`firma_documento`);
