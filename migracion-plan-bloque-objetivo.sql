-- =====================================================
-- MIGRACIÓN: asignación de objetivos por BLOQUE de sesiones
-- Ejecutar una sola vez sobre la BD existente.
-- =====================================================

CREATE TABLE IF NOT EXISTS `plan_bloque_objetivo` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `plan_id` INT(11) NOT NULL,
  `objetivo_especifico_id` INT(11) NOT NULL,
  `numero_bloque` INT(11) NOT NULL COMMENT 'Bloque de 4 sesiones (1..N)',
  `user_id_crea` INT(11) NULL,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bo_plan` FOREIGN KEY (`plan_id`)
    REFERENCES `plan_terapeutico`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bo_oe` FOREIGN KEY (`objetivo_especifico_id`)
    REFERENCES `plan_objetivo_especifico`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_bo` (`objetivo_especifico_id`, `numero_bloque`),
  INDEX `idx_bo_plan` (`plan_id`, `numero_bloque`, `flg_activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permitir registros con solo observación (sin resultado marcado).
ALTER TABLE `plan_registro_sesion` MODIFY `resultado_id` INT(11) NULL
  COMMENT 'NULL = solo observación, sin resultado marcado';

-- Retro-compat: marca como asignados los bloques que ya tienen registros guardados,
-- para que los planes existentes sigan mostrando sus objetivos por bloque.
INSERT INTO `plan_bloque_objetivo` (`plan_id`, `objetivo_especifico_id`, `numero_bloque`, `flg_activo`)
SELECT g.plan_id,
       r.objetivo_especifico_id,
       FLOOR((r.numero_sesion - 1) / 4) + 1 AS numero_bloque,
       1
FROM `plan_registro_sesion` r
INNER JOIN `plan_objetivo_especifico` e ON e.id = r.objetivo_especifico_id
INNER JOIN `plan_objetivo_general` g ON g.id = e.objetivo_general_id
WHERE r.flg_activo = 1
GROUP BY g.plan_id, r.objetivo_especifico_id, numero_bloque
ON DUPLICATE KEY UPDATE `flg_activo` = 1;
