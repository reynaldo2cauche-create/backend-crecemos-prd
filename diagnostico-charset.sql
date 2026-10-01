-- Diagnóstico: lista todas las columnas de texto que NO son utf8mb4
-- (esas son las que fallan al guardar caracteres como → – “ ” emojis).
-- Reemplaza 'crecemos_prod' por el nombre real de tu base de datos.

SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'crecemos_prod'
  AND CHARACTER_SET_NAME IS NOT NULL
  AND CHARACTER_SET_NAME <> 'utf8mb4'
ORDER BY TABLE_NAME, COLUMN_NAME;
