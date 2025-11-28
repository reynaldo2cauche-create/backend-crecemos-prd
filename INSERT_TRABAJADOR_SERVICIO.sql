-- =============================================
-- INSERTAR RELACIONES TRABAJADOR-SERVICIO
-- =============================================

USE crecemos_website;

-- IMPORTANTE: Verifica primero los IDs de tus servicios
-- SELECT * FROM servicios;

-- =============================================
-- Asumiendo que los servicios son:
-- ID 1 = Terapia de Lenguaje
-- ID 2 = Psicología
-- ID 3 = Terapia Ocupacional
-- ID 4 = Terapia Física
-- =============================================

-- Terapeutas de Lenguaje
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(1, 1, 'Terapeuta de Lenguaje - Merlin Fernández', true),  -- Merlin - Terapia de Lenguaje
(3, 1, 'Terapeuta de Lenguaje - Lizbeth Olortegui', true), -- Lizbeth - Terapia de Lenguaje
(19, 1, 'Terapeuta de Lenguaje - Prueba', true);           -- Prueba - Terapia de Lenguaje (especialidad_id: 2)

-- Psicólogas
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(2, 2, 'Psicóloga - María Fernanda Cueva', true),  -- María Fernanda - Psicología
(4, 2, 'Psicóloga - Linda Samanez', true),         -- Linda - Psicología
(7, 2, 'Psicóloga - Cherly Quiuia', true),         -- Cherly - Psicología
(15, 2, 'Psicóloga - Jhoselyn Quispe', true),      -- Jhoselyn - Psicología (especialidad_id: 4)
(17, 2, 'Psicóloga - Giselle Burgos', true);       -- Giselle - Psicología (especialidad_id: 5)

-- Terapia Ocupacional
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(16, 3, 'Terapeuta Ocupacional - Flor Daniela Calle', true);  -- Flor Daniela (especialidad_id: 3)

-- =============================================
-- SI TIENES MÁS SERVICIOS, agrega aquí:
-- =============================================

-- Ejemplo: Si un terapeuta puede dar múltiples servicios
-- INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
-- (1, 4, 'También da Terapia Física', true);

-- =============================================
-- VERIFICAR LOS DATOS INSERTADOS
-- =============================================
SELECT
    ts.id,
    CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
    s.nombre AS servicio,
    ts.observaciones,
    ts.activo,
    ts.fecha_asignacion
FROM trabajador_servicio ts
INNER JOIN trabajador_centro t ON ts.trabajador_id = t.id
INNER JOIN servicios s ON ts.servicio_id = s.id
ORDER BY s.nombre, t.apellidos;

-- =============================================
-- NOTA: Antes de ejecutar este script:
-- 1. Ejecuta: SELECT * FROM servicios;
-- 2. Verifica los IDs de tus servicios
-- 3. Ajusta los INSERT según corresponda
-- =============================================
