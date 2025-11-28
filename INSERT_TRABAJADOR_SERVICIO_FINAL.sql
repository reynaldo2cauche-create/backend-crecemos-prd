-- =============================================
-- INSERTAR RELACIONES TRABAJADOR-SERVICIO
-- Con IDs correctos de tus servicios
-- =============================================

USE crecemos_website;

-- =============================================
-- 🗑️ LIMPIAR DATOS ANTERIORES
-- =============================================
-- Desactivar modo seguro temporalmente
SET SQL_SAFE_UPDATES = 0;

DELETE FROM trabajador_servicio;

-- Reiniciar el auto_increment (opcional)
ALTER TABLE trabajador_servicio AUTO_INCREMENT = 1;

-- Reactivar modo seguro
SET SQL_SAFE_UPDATES = 1;

-- =============================================
-- 1. TERAPEUTAS DE LENGUAJE
-- =============================================
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(1, 1, 'Terapeuta de Lenguaje - Merlin Fernández Guadalupe', true),
(3, 1, 'Terapeuta de Lenguaje - Lizbeth Olortegui Eneque', true),
(19, 1, 'Terapeuta de Lenguaje - Prueba', true);

-- También pueden dar Terapia de Lenguaje del Área 2
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(1, 10, 'Terapia de Lenguaje Área 2 - Merlin Fernández', true),
(3, 10, 'Terapia de Lenguaje Área 2 - Lizbeth Olortegui', true),
(19, 10, 'Terapia de Lenguaje Área 2 - Prueba', true);

-- =============================================
-- 2. PSICÓLOGAS
-- =============================================
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
-- Psicología
(2, 4, 'Psicóloga Infantil - María Fernanda Cueva Colan', true),
(4, 4, 'Psicóloga - Linda Samanez Angeles', true),
(7, 4, 'Psicóloga - Cherly Quiuia', true),
(15, 4, 'Psicóloga - Jhoselyn Quispe Medina', true),
(17, 4, 'Psicóloga - Giselle Burgos', true);

-- Evaluación Psicológica para Colegio
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(2, 5, 'Evaluación Psicológica - María Fernanda Cueva', true),
(4, 5, 'Evaluación Psicológica - Linda Samanez', true),
(7, 5, 'Evaluación Psicológica - Cherly Quiuia', true),
(15, 5, 'Evaluación Psicológica - Jhoselyn Quispe', true),
(17, 5, 'Evaluación Psicológica - Giselle Burgos', true);

-- Orientación Vocacional
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(2, 6, 'Orientación Vocacional - María Fernanda Cueva', true),
(4, 6, 'Orientación Vocacional - Linda Samanez', true),
(7, 6, 'Orientación Vocacional - Cherly Quiuia', true),
(15, 6, 'Orientación Vocacional - Jhoselyn Quispe', true),
(17, 6, 'Orientación Vocacional - Giselle Burgos', true);

-- Psicoterapia Individual (Área 2)
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(2, 7, 'Psicoterapia Individual - María Fernanda Cueva', true),
(4, 7, 'Psicoterapia Individual - Linda Samanez', true),
(7, 7, 'Psicoterapia Individual - Cherly Quiuia', true),
(15, 7, 'Psicoterapia Individual - Jhoselyn Quispe', true),
(17, 7, 'Psicoterapia Individual - Giselle Burgos', true);

-- Terapia de Pareja (Área 2)
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(2, 8, 'Terapia de Pareja - María Fernanda Cueva', true),
(4, 8, 'Terapia de Pareja - Linda Samanez', true),
(7, 8, 'Terapia de Pareja - Cherly Quiuia', true),
(15, 8, 'Terapia de Pareja - Jhoselyn Quispe', true),
(17, 8, 'Terapia de Pareja - Giselle Burgos', true);

-- Terapia Familiar (Área 2)
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(2, 9, 'Terapia Familiar - María Fernanda Cueva', true),
(4, 9, 'Terapia Familiar - Linda Samanez', true),
(7, 9, 'Terapia Familiar - Cherly Quiuia', true),
(15, 9, 'Terapia Familiar - Jhoselyn Quispe', true),
(17, 9, 'Terapia Familiar - Giselle Burgos', true);

-- =============================================
-- 3. TERAPEUTA OCUPACIONAL
-- =============================================
INSERT INTO trabajador_servicio (trabajador_id, servicio_id, observaciones, activo) VALUES
(16, 2, 'Terapeuta Ocupacional - Flor Daniela Calle Villavicencio', true);

-- =============================================
-- VERIFICAR LOS DATOS INSERTADOS
-- =============================================
SELECT
    s.nombre AS 'Servicio',
    COUNT(ts.id) AS 'Cantidad Trabajadores',
    GROUP_CONCAT(CONCAT(t.nombres, ' ', t.apellidos) SEPARATOR ', ') AS 'Trabajadores'
FROM servicios s
LEFT JOIN trabajador_servicio ts ON s.id = ts.servicio_id AND ts.activo = true
LEFT JOIN trabajador_centro t ON ts.trabajador_id = t.id
GROUP BY s.id, s.nombre
ORDER BY s.id;

-- Ver detalle completo
SELECT
    CONCAT(t.nombres, ' ', t.apellidos) AS 'Trabajador',
    s.nombre AS 'Servicio',
    a.nombre AS 'Área',
    ts.observaciones,
    ts.fecha_asignacion,
    ts.activo
FROM trabajador_servicio ts
INNER JOIN trabajador_centro t ON ts.trabajador_id = t.id
INNER JOIN servicios s ON ts.servicio_id = s.id
INNER JOIN area_servicio a ON s.area_id = a.id
WHERE ts.activo = true
ORDER BY t.apellidos, s.nombre;
