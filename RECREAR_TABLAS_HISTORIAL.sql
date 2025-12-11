-- ============================================================================
-- RECREAR TABLAS DE HISTORIAL DE TERAPEUTAS Y SERVICIOS
-- ============================================================================

-- Eliminar si existen (por si acaso)
DROP TABLE IF EXISTS historial_cita_terapeutas;
DROP TABLE IF EXISTS historial_cita_servicios;

-- ============================================================================
-- TABLA: historial_cita_terapeutas
-- ============================================================================
CREATE TABLE historial_cita_terapeutas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  historial_cita_id INT NOT NULL COMMENT 'ID del registro de historial',
  terapeuta_id INT NOT NULL COMMENT 'ID del terapeuta',
  user_crea_id INT NULL COMMENT 'Usuario que creó el registro',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (historial_cita_id) REFERENCES historial_citas(id) ON DELETE CASCADE,
  FOREIGN KEY (terapeuta_id) REFERENCES trabajadores_centro(id) ON DELETE CASCADE,

  -- Índices para queries rápidas
  INDEX idx_historial_cita_id (historial_cita_id),
  INDEX idx_terapeuta_id (terapeuta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Terapeutas asociados a cada registro del historial de citas';


-- ============================================================================
-- TABLA: historial_cita_servicios
-- ============================================================================
CREATE TABLE historial_cita_servicios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  historial_cita_id INT NOT NULL COMMENT 'ID del registro de historial',
  servicio_id INT NOT NULL COMMENT 'ID del servicio',
  user_crea_id INT NULL COMMENT 'Usuario que creó el registro',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (historial_cita_id) REFERENCES historial_citas(id) ON DELETE CASCADE,
  FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,

  -- Índices para queries rápidas
  INDEX idx_historial_cita_id (historial_cita_id),
  INDEX idx_servicio_id (servicio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Servicios asociados a cada registro del historial de citas';


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT
  'Tabla historial_cita_terapeutas creada' as verificacion,
  COUNT(*) as total_columnas
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'historial_cita_terapeutas';

SELECT
  'Tabla historial_cita_servicios creada' as verificacion,
  COUNT(*) as total_columnas
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'historial_cita_servicios';


-- ============================================================================
-- NOTAS
-- ============================================================================
/*
CARACTERÍSTICAS:
✅ SIN rol_en_cita - Todos los terapeutas al mismo nivel
✅ Índices optimizados para queries rápidas
✅ Foreign keys con CASCADE para integridad referencial
✅ Timestamps automáticos
✅ Comentarios descriptivos

ESTRUCTURA FINAL:

historial_cita_terapeutas
├── id
├── historial_cita_id → historial_citas(id)
├── terapeuta_id → trabajadores_centro(id)
└── created_at

historial_cita_servicios
├── id
├── historial_cita_id → historial_citas(id)
├── servicio_id → servicios(id)
└── created_at
*/
