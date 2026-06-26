-- =====================================================
-- MIGRACIÓN: materiales granulares para Terapia de Lenguaje
-- (Infantil, Adolescentes y Adultos)
-- Agrega columnas nuevas a indicacion_materiales para reflejar
-- la lista exacta de materiales de lenguaje. Los servicios
-- restantes siguen usando las columnas ya existentes.
-- Ejecutar UNA sola vez sobre la BD existente.
-- =====================================================

ALTER TABLE `indicacion_materiales`
  ADD COLUMN `guantes`               TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Guantes por sesión',
  ADD COLUMN `bajalengua`            TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Paquete de bajalengua',
  ADD COLUMN `hisopos_pequenos`      TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Paquete de hisopos pequeños',
  ADD COLUMN `hisopos_largos`        TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Paquete de hisopos largos',
  ADD COLUMN `plumones_gruesos`      TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Estuche plumones gruesos',
  ADD COLUMN `cuaderno_cuadriculado` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 cuaderno cuadriculado A4',
  ADD COLUMN `cuaderno_decroly`      TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 cuaderno decroly';
