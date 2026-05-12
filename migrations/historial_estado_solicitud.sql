CREATE TABLE historial_estado_solicitud (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_informe_id INT UNSIGNED NOT NULL,
  estado_anterior_id   TINYINT UNSIGNED NULL     COMMENT 'NULL en la creación inicial',
  estado_nuevo_id      TINYINT UNSIGNED NOT NULL,
  user_id              INT UNSIGNED NULL         COMMENT 'Trabajador que realizó el cambio',
  observacion          TEXT NULL                 COMMENT 'Nota interna opcional',
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (solicitud_informe_id) REFERENCES solicitud_informe(id) ON DELETE CASCADE,
  FOREIGN KEY (estado_anterior_id)   REFERENCES estado_solicitud_informe(id),
  FOREIGN KEY (estado_nuevo_id)      REFERENCES estado_solicitud_informe(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
