-- Agrega la columna sitio_web a la tabla convenios
-- URL/página del convenio para derivar al usuario

ALTER TABLE `convenios`
  ADD COLUMN `sitio_web` VARCHAR(500) NULL AFTER `logo_url`;
