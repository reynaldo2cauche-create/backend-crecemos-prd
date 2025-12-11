-- ============================================================================
-- MIGRACIÓN: LIMPIAR Y OPTIMIZAR MÓDULO DE CITAS
-- Sistema: Centro Crecemos
-- Autor: Refactorización completa
-- Fecha: 2025-12-11
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR TABLA DE TIPOS DE CITA
-- ============================================================================

CREATE TABLE IF NOT EXISTS tipos_cita (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(50) UNIQUE NOT NULL COMMENT 'Código único del tipo',
  nombre VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo del tipo',
  descripcion TEXT COMMENT 'Descripción detallada',
  requiere_terapeuta BOOLEAN DEFAULT TRUE COMMENT 'Si requiere asignar terapeuta',
  permite_multiples_terapeutas BOOLEAN DEFAULT FALSE COMMENT 'Si permite múltiples terapeutas',
  permite_multiples_servicios BOOLEAN DEFAULT FALSE COMMENT 'Si permite múltiples servicios',
  activo BOOLEAN DEFAULT TRUE,
  user_crea_id INT NULL COMMENT 'Usuario que creó el registro',
  user_actua_id INT NULL COMMENT 'Usuario que actualizó el registro',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_codigo (codigo),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de tipos de cita';

-- Insertar los 3 tipos de cita
INSERT INTO tipos_cita (codigo, nombre, descripcion, requiere_terapeuta, permite_multiples_terapeutas, permite_multiples_servicios) VALUES
('NORMAL', 'Cita Normal', 'Cita individual con un terapeuta y un servicio', TRUE, FALSE, FALSE),
('REUNION_CLINICA', 'Reunión Clínica', 'Reunión con múltiples terapeutas y servicios', TRUE, TRUE, TRUE),
('VISITA_ESCOLAR', 'Visita Escolar', 'Visita a institución educativa con encargado', FALSE, FALSE, FALSE);


-- ============================================================================
-- PASO 2: CREAR TABLA DE ENCARGADOS PARA VISITAS ESCOLARES
-- ============================================================================

CREATE TABLE IF NOT EXISTS cita_encargados (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cita_id INT NOT NULL COMMENT 'ID de la cita',
  nombre_completo VARCHAR(200) NOT NULL COMMENT 'Nombre del encargado',
  cargo VARCHAR(100) COMMENT 'Cargo: Director, Auxiliar, Psicóloga, etc',
  institucion VARCHAR(200) COMMENT 'Nombre de la institución educativa',
  telefono VARCHAR(20) COMMENT 'Teléfono de contacto',
  email VARCHAR(100) COMMENT 'Email de contacto',
  user_crea_id INT NULL COMMENT 'Usuario que creó el registro',
  user_actua_id INT NULL COMMENT 'Usuario que actualizó el registro',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE,
  INDEX idx_cita_id (cita_id),
  INDEX idx_institucion (institucion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Encargados de visitas escolares';


-- ============================================================================
-- PASO 3: MODIFICAR TABLA CITAS - AGREGAR TIPO_CITA_ID
-- ============================================================================

-- Agregar columna tipo_cita_id (temporal como nullable)
ALTER TABLE citas
ADD COLUMN tipo_cita_id INT NULL COMMENT 'Tipo de cita' AFTER id;

-- Migrar datos existentes: determinar el tipo basado en si tiene múltiples terapeutas/servicios
UPDATE citas c
SET c.tipo_cita_id = (
  CASE
    WHEN (
      SELECT COUNT(*) FROM cita_terapeutas ct WHERE ct.cita_id = c.id
    ) > 1 OR (
      SELECT COUNT(*) FROM cita_servicios cs WHERE cs.cita_id = c.id
    ) > 1
    THEN 2  -- REUNION_CLINICA
    ELSE 1  -- NORMAL
  END
);

-- Ahora hacer la columna NOT NULL y agregar foreign key
ALTER TABLE citas
MODIFY COLUMN tipo_cita_id INT NOT NULL;

ALTER TABLE citas
ADD CONSTRAINT fk_citas_tipo_cita
FOREIGN KEY (tipo_cita_id) REFERENCES tipos_cita(id);

-- Agregar índice para consultas rápidas por tipo
CREATE INDEX idx_tipo_cita ON citas(tipo_cita_id);


-- ============================================================================
-- PASO 4: LIMPIAR TABLA CITAS - HACER CAMPOS OPCIONALES
-- ============================================================================

-- Hacer doctor_id y servicio_id NULLABLE para reuniones clínicas y visitas escolares
ALTER TABLE citas MODIFY COLUMN doctor_id INT NULL COMMENT 'Terapeuta principal (NULL para reuniones clínicas)';
ALTER TABLE citas MODIFY COLUMN servicio_id INT NULL COMMENT 'Servicio principal (NULL para múltiples servicios)';


-- ============================================================================
-- PASO 5: LIMPIAR TABLA CITA_TERAPEUTAS - ELIMINAR ROL_EN_CITA
-- ============================================================================

-- Este campo no se está usando correctamente, todos tienen 'apoyo'
-- Para reuniones clínicas todos los terapeutas tienen el mismo nivel
ALTER TABLE cita_terapeutas DROP COLUMN IF EXISTS rol_en_cita;

-- Agregar campos de auditoría
ALTER TABLE cita_terapeutas
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER terapeuta_id,
ADD COLUMN IF NOT EXISTS user_actua_id INT NULL COMMENT 'Usuario que actualizó el registro' AFTER user_crea_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER user_actua_id,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Optimizar índices
CREATE INDEX idx_cita_id ON cita_terapeutas(cita_id) IF NOT EXISTS;
CREATE INDEX idx_terapeuta_id ON cita_terapeutas(terapeuta_id) IF NOT EXISTS;
CREATE UNIQUE INDEX idx_cita_terapeuta_unique ON cita_terapeutas(cita_id, terapeuta_id) IF NOT EXISTS;


-- ============================================================================
-- PASO 6: OPTIMIZAR TABLA CITA_SERVICIOS
-- ============================================================================

-- Agregar campos de auditoría
ALTER TABLE cita_servicios
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER servicio_id,
ADD COLUMN IF NOT EXISTS user_actua_id INT NULL COMMENT 'Usuario que actualizó el registro' AFTER user_crea_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER user_actua_id,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Agregar índices para consultas rápidas
CREATE INDEX idx_cita_id ON cita_servicios(cita_id) IF NOT EXISTS;
CREATE INDEX idx_servicio_id ON cita_servicios(servicio_id) IF NOT EXISTS;
CREATE UNIQUE INDEX idx_cita_servicio_unique ON cita_servicios(cita_id, servicio_id) IF NOT EXISTS;


-- ============================================================================
-- PASO 7: MODIFICAR TABLA HISTORIAL_CITAS - AGREGAR TIPO_CITA_ID
-- ============================================================================

ALTER TABLE historial_citas
ADD COLUMN tipo_cita_id INT NULL COMMENT 'Tipo de cita en el momento del registro' AFTER cita_id;

-- Migrar datos históricos
UPDATE historial_citas hc
SET hc.tipo_cita_id = (
  CASE
    WHEN (
      SELECT COUNT(*) FROM historial_cita_terapeutas hct WHERE hct.historial_cita_id = hc.id
    ) > 1 OR (
      SELECT COUNT(*) FROM historial_cita_servicios hcs WHERE hcs.historial_cita_id = hc.id
    ) > 1
    THEN 2  -- REUNION_CLINICA
    ELSE 1  -- NORMAL
  END
);

-- Hacer NOT NULL
ALTER TABLE historial_citas
MODIFY COLUMN tipo_cita_id INT NOT NULL;

ALTER TABLE historial_citas
ADD CONSTRAINT fk_historial_tipo_cita
FOREIGN KEY (tipo_cita_id) REFERENCES tipos_cita(id);

CREATE INDEX idx_historial_tipo_cita ON historial_citas(tipo_cita_id);


-- ============================================================================
-- PASO 8: LIMPIAR TABLA HISTORIAL_CITA_TERAPEUTAS - ELIMINAR ROL_EN_CITA
-- ============================================================================

ALTER TABLE historial_cita_terapeutas DROP COLUMN IF EXISTS rol_en_cita;

-- Agregar campos de auditoría
ALTER TABLE historial_cita_terapeutas
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER terapeuta_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER user_crea_id;

-- Optimizar índices
CREATE INDEX idx_historial_cita_id ON historial_cita_terapeutas(historial_cita_id) IF NOT EXISTS;
CREATE INDEX idx_terapeuta_id ON historial_cita_terapeutas(terapeuta_id) IF NOT EXISTS;


-- ============================================================================
-- PASO 9: OPTIMIZAR TABLA HISTORIAL_CITA_SERVICIOS
-- ============================================================================

-- Agregar campos de auditoría
ALTER TABLE historial_cita_servicios
ADD COLUMN IF NOT EXISTS user_crea_id INT NULL COMMENT 'Usuario que creó el registro' AFTER servicio_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER user_crea_id;

CREATE INDEX idx_historial_cita_id ON historial_cita_servicios(historial_cita_id) IF NOT EXISTS;
CREATE INDEX idx_servicio_id ON historial_cita_servicios(servicio_id) IF NOT EXISTS;


-- ============================================================================
-- PASO 10: HACER CAMPOS OPCIONALES EN HISTORIAL
-- ============================================================================

ALTER TABLE historial_citas MODIFY COLUMN doctor_id INT NULL;
ALTER TABLE historial_citas MODIFY COLUMN servicio_id INT NULL;


-- ============================================================================
-- PASO 11: OPTIMIZAR ÍNDICES COMPUESTOS PARA QUERIES COMUNES
-- ============================================================================

-- Índice para buscar citas por fecha y terapeuta (query más común)
CREATE INDEX idx_citas_fecha_doctor ON citas(fecha, doctor_id);

-- Índice para buscar citas por paciente y fecha
CREATE INDEX idx_citas_paciente_fecha ON citas(paciente_id, fecha);

-- Índice para buscar citas por estado y fecha (para reportes)
CREATE INDEX idx_citas_estado_fecha ON citas(estado_id, fecha);

-- Índice para buscar historial por cita y fecha
CREATE INDEX idx_historial_cita_fecha ON historial_citas(cita_id, fecha_registro);


-- ============================================================================
-- VERIFICACIÓN: CONSULTAS PARA VALIDAR LA MIGRACIÓN
-- ============================================================================

-- Verificar que todas las citas tienen tipo
SELECT
  'Citas sin tipo' as verificacion,
  COUNT(*) as cantidad
FROM citas
WHERE tipo_cita_id IS NULL;

-- Ver distribución de tipos de cita
SELECT
  tc.nombre,
  COUNT(c.id) as cantidad_citas
FROM tipos_cita tc
LEFT JOIN citas c ON c.tipo_cita_id = tc.id
GROUP BY tc.id, tc.nombre
ORDER BY tc.id;

-- Verificar integridad de reuniones clínicas
SELECT
  'Reuniones clínicas' as tipo,
  COUNT(*) as total,
  COUNT(DISTINCT ct.terapeuta_id) as total_terapeutas,
  COUNT(DISTINCT cs.servicio_id) as total_servicios
FROM citas c
LEFT JOIN cita_terapeutas ct ON ct.cita_id = c.id
LEFT JOIN cita_servicios cs ON cs.cita_id = c.id
WHERE c.tipo_cita_id = 2;

-- Verificar citas normales
SELECT
  'Citas normales' as tipo,
  COUNT(*) as total,
  COUNT(c.doctor_id) as con_terapeuta,
  COUNT(c.servicio_id) as con_servicio
FROM citas c
WHERE c.tipo_cita_id = 1;


-- ============================================================================
-- NOTAS FINALES
-- ============================================================================

/*
ESTRUCTURA FINAL:

1. CITA NORMAL (tipo_cita_id = 1):
   - doctor_id: ID del terapeuta
   - servicio_id: ID del servicio
   - NO usa cita_terapeutas ni cita_servicios

2. REUNIÓN CLÍNICA (tipo_cita_id = 2):
   - doctor_id: NULL o ID del primer terapeuta (opcional)
   - servicio_id: NULL
   - USA cita_terapeutas (múltiples terapeutas sin jerarquía)
   - USA cita_servicios (múltiples servicios sin jerarquía)

3. VISITA ESCOLAR (tipo_cita_id = 3):
   - doctor_id: NULL
   - servicio_id: ID del servicio si aplica
   - USA cita_encargados (datos del encargado de la institución)

VENTAJAS:
✅ Sin redundancia innecesaria
✅ Queries super rápidas (índices optimizados)
✅ Escalable para nuevos tipos
✅ Sin JSON en MySQL
✅ Historial completo por tipo
✅ Sin jerarquías en terapeutas/servicios
*/
