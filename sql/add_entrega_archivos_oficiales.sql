-- Migración: entrega DUAL independiente (digital obligatoria + física opcional)
-- Si ya corriste la versión anterior, ejecuta primero el bloque de DROP:

-- Limpiar columnas anteriores (solo si ya existen)
ALTER TABLE archivos_oficiales
  DROP FOREIGN KEY IF EXISTS fk_archivos_oficiales_entregado_por,
  DROP COLUMN IF EXISTS tipo_entrega,
  DROP COLUMN IF EXISTS fecha_entrega,
  DROP COLUMN IF EXISTS entregado_por_id;

-- Agregar nuevas columnas de entrega dual
ALTER TABLE archivos_oficiales
  -- Entrega digital (virtual) — OBLIGATORIA
  ADD COLUMN entrega_digital   TINYINT(1)  NOT NULL DEFAULT 0         COMMENT '1 = marcada como entregada digitalmente',
  ADD COLUMN fecha_entrega_digital  DATETIME NULL DEFAULT NULL        COMMENT 'Fecha y hora de la entrega digital',
  ADD COLUMN entregado_digital_por_id INT  NULL DEFAULT NULL          COMMENT 'Trabajador que registró la entrega digital',

  -- Entrega física — OPCIONAL
  ADD COLUMN entrega_fisica    TINYINT(1)  NOT NULL DEFAULT 0         COMMENT '1 = marcada como entregada físicamente',
  ADD COLUMN fecha_entrega_fisica   DATETIME NULL DEFAULT NULL        COMMENT 'Fecha y hora de la entrega física',
  ADD COLUMN entregado_fisico_por_id INT   NULL DEFAULT NULL          COMMENT 'Trabajador que registró la entrega física',

  ADD CONSTRAINT fk_archivos_entregado_digital_por
    FOREIGN KEY (entregado_digital_por_id) REFERENCES trabajador_centro(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_archivos_entregado_fisico_por
    FOREIGN KEY (entregado_fisico_por_id)  REFERENCES trabajador_centro(id) ON DELETE SET NULL;
