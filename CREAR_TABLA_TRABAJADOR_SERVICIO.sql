-- =============================================
-- CREAR TABLA RELACIÓN TRABAJADOR-SERVICIO
-- Permite asignar múltiples servicios a un trabajador
-- =============================================

USE crecemos_website;

-- Crear la tabla de relación
CREATE TABLE IF NOT EXISTS trabajador_servicio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trabajador_id INT NOT NULL,
  servicio_id INT NOT NULL,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT TRUE,
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  CONSTRAINT fk_trabajador_servicio_trabajador
    FOREIGN KEY (trabajador_id) REFERENCES trabajador_centro(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_trabajador_servicio_servicio
    FOREIGN KEY (servicio_id) REFERENCES servicios(id)
    ON DELETE CASCADE,

  -- Evitar duplicados: un trabajador no puede tener el mismo servicio dos veces activo
  UNIQUE KEY unique_trabajador_servicio (trabajador_id, servicio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear índices para mejorar performance
CREATE INDEX idx_trabajador_id ON trabajador_servicio(trabajador_id);
CREATE INDEX idx_servicio_id ON trabajador_servicio(servicio_id);
CREATE INDEX idx_activo ON trabajador_servicio(activo);

-- Verificar que se creó correctamente
DESCRIBE trabajador_servicio;

-- Ver la estructura completa
SHOW CREATE TABLE trabajador_servicio;
