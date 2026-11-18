-- ============================================================================
-- Migración: Reprogramación de citas (control por sesión)
-- ----------------------------------------------------------------------------
-- Regla de negocio:
--   * Admisión puede reprogramar (cambiar fecha/hora) una cita UNA sola vez.
--     Al hacerlo, la cita queda marcada reprogramada = 1.
--   * Una cita ya reprogramada NO puede volver a moverla Admisión:
--     solo el Administrador, previa coordinación y registrando el motivo.
--   * Nace en 0 para todas las citas → los pacientes antiguos empiezan de cero
--     a partir de la activación (no se cuentan reprogramaciones pasadas).
-- Ejecutar una sola vez sobre la BD de producción.
-- ============================================================================

ALTER TABLE `citas`
  ADD COLUMN `reprogramada` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Sesión ya reprogramada por Admisión (1 = sí). Una ya reprogramada solo la mueve Administrador'
    AFTER `flg_activo`,
  ADD COLUMN `reprogramada_motivo` TEXT NULL
    COMMENT 'Motivo de la (última) reprogramación'
    AFTER `reprogramada`,
  ADD COLUMN `reprogramada_por` INT NULL
    COMMENT 'ID del trabajador que reprogramó (trabajador_centro.id)'
    AFTER `reprogramada_motivo`,
  ADD COLUMN `reprogramada_at` DATETIME NULL
    COMMENT 'Fecha/hora de la (última) reprogramación'
    AFTER `reprogramada_por`;
