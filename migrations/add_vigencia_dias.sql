-- Agrega vigencia en días para complementar vigencia_meses
-- Permite expresar vigencias como "1 mes y 15 días" de forma exacta.
ALTER TABLE tipos_archivo
  ADD COLUMN vigencia_dias SMALLINT NULL AFTER vigencia_meses;
