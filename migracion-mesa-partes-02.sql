-- ============================================================================
-- MESA DE PARTES — ajuste 02
--  (1) Agrega columna "asunto" (título breve del documento)
--  (2) Amplía el catálogo de tipos: desde documentos legales hasta lo más mínimo
-- ============================================================================

-- (1) Asunto: título breve/descriptivo del documento entregado
ALTER TABLE mesa_partes_solicitud
  ADD COLUMN asunto VARCHAR(200) NULL AFTER tipo_id;

-- (2) Más tipos de solicitud (solo inserta los que falten)
INSERT INTO mesa_partes_tipo (nombre)
SELECT * FROM (SELECT 'Documento legal / notarial' AS n) x
WHERE NOT EXISTS (SELECT 1 FROM mesa_partes_tipo WHERE nombre = x.n);

INSERT INTO mesa_partes_tipo (nombre)
SELECT * FROM (SELECT 'Documento judicial / requerimiento' AS n) x
WHERE NOT EXISTS (SELECT 1 FROM mesa_partes_tipo WHERE nombre = x.n);

INSERT INTO mesa_partes_tipo (nombre)
SELECT * FROM (SELECT 'Carta u oficio' AS n) x
WHERE NOT EXISTS (SELECT 1 FROM mesa_partes_tipo WHERE nombre = x.n);

INSERT INTO mesa_partes_tipo (nombre)
SELECT * FROM (SELECT 'Autorización / Consentimiento' AS n) x
WHERE NOT EXISTS (SELECT 1 FROM mesa_partes_tipo WHERE nombre = x.n);

INSERT INTO mesa_partes_tipo (nombre)
SELECT * FROM (SELECT 'Copia de historia clínica' AS n) x
WHERE NOT EXISTS (SELECT 1 FROM mesa_partes_tipo WHERE nombre = x.n);

INSERT INTO mesa_partes_tipo (nombre)
SELECT * FROM (SELECT 'Solicitud general' AS n) x
WHERE NOT EXISTS (SELECT 1 FROM mesa_partes_tipo WHERE nombre = x.n);

-- ============================================================================
-- FIN ajuste 02
-- ============================================================================
