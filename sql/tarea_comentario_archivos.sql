CREATE TABLE IF NOT EXISTS `tarea_comentario_archivos` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `comentario_id`    INT          NOT NULL,
  `nombre_original`  VARCHAR(255) NOT NULL,
  `nombre_guardado`  VARCHAR(255) NOT NULL,
  `url`              VARCHAR(500) NOT NULL,
  `tipo_mime`        VARCHAR(100) NULL,
  `tamanio`          INT          NULL,
  `user_crea_id`     INT          NULL,
  `created_at`       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_comentario_archivos_comentario`
    FOREIGN KEY (`comentario_id`) REFERENCES `tarea_comentarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_comentario_archivos_user`
    FOREIGN KEY (`user_crea_id`) REFERENCES `trabajador_centro` (`id`) ON DELETE SET NULL
);
