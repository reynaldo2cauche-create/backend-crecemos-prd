-- ============================================================
-- Migración: Crear tabla notificaciones_leidas
-- Descripción: Trackea qué usuario específico ha leído cada notificación
-- ============================================================

CREATE TABLE IF NOT EXISTS notificaciones_leidas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  notificacion_id BIGINT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  fecha_lectura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Índices para mejorar performance
  INDEX idx_notificacion (notificacion_id),
  INDEX idx_usuario (usuario_id),
  UNIQUE KEY unique_notif_usuario (notificacion_id, usuario_id),

  -- Foreign keys
  CONSTRAINT fk_notif_leida_notificacion
    FOREIGN KEY (notificacion_id)
    REFERENCES notificaciones(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_notif_leida_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES trabajador_centro(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Verificación: Ver estructura de la tabla
-- ============================================================
DESCRIBE notificaciones_leidas;
