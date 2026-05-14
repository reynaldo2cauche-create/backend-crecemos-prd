-- Tabla para archivos adjuntos de tareas
CREATE TABLE IF NOT EXISTS `tarea_archivos` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `tarea_id`         INT          NOT NULL,
  `nombre_original`  VARCHAR(255) NOT NULL,
  `nombre_guardado`  VARCHAR(255) NOT NULL,
  `url`              VARCHAR(500) NOT NULL,
  `tipo_mime`        VARCHAR(100) NULL,
  `tamanio`          INT          NULL,
  `user_crea_id`     INT          NULL,
  `created_at`       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_tarea_archivos_tarea`
    FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_tarea_archivos_user`
    FOREIGN KEY (`user_crea_id`) REFERENCES `trabajador_centro` (`id`) ON DELETE SET NULL
);
