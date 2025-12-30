-- =====================================================
-- MIGRACIÓN: Eliminar tabla intermedia beneficio_convenio
-- y agregar relación directa convenio_id en beneficios
-- =====================================================

-- PASO 1: Agregar columna convenio_id a la tabla beneficios (si no existe)
ALTER TABLE beneficios
ADD COLUMN IF NOT EXISTS convenio_id INTEGER;

-- PASO 2: Migrar datos de la tabla intermedia a beneficios
-- Esto toma el primer convenio asociado a cada beneficio (si existe)
UPDATE beneficios b
SET convenio_id = (
    SELECT bc.convenio_id
    FROM beneficio_convenio bc
    WHERE bc.beneficio_id = b.id
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM beneficio_convenio bc
    WHERE bc.beneficio_id = b.id
);

-- PASO 3: Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_beneficios_convenio_id
ON beneficios(convenio_id);

-- PASO 4: Agregar foreign key constraint (opcional pero recomendado)
ALTER TABLE beneficios
ADD CONSTRAINT fk_beneficios_convenio
FOREIGN KEY (convenio_id)
REFERENCES convenios(id)
ON DELETE CASCADE;

-- PASO 5: Eliminar la tabla intermedia beneficio_convenio
DROP TABLE IF EXISTS beneficio_convenio;

-- =====================================================
-- VERIFICACIÓN: Consultas para verificar la migración
-- =====================================================

-- Ver todos los beneficios con su convenio asociado
SELECT
    b.id,
    b.nombre AS beneficio_nombre,
    b.descripcion,
    b.categoria,
    b.descuento,
    b.convenio_id,
    c.nombre AS convenio_nombre,
    b.activo
FROM beneficios b
LEFT JOIN convenios c ON b.convenio_id = c.id
ORDER BY b.id;

-- Contar beneficios por convenio
SELECT
    c.id,
    c.nombre AS convenio,
    COUNT(b.id) AS cantidad_beneficios
FROM convenios c
LEFT JOIN beneficios b ON b.convenio_id = c.id
GROUP BY c.id, c.nombre
ORDER BY cantidad_beneficios DESC;

-- Ver beneficios sin convenio asignado (estos necesitan atención manual)
SELECT
    id,
    nombre,
    descripcion
FROM beneficios
WHERE convenio_id IS NULL;
