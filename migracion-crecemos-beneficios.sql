-- ============================================================
-- CRECEMOS BENEFICIOS — Programa de fidelización por puntos
-- Fecha de implementación: 01/12/2026
-- Idempotente. utf8mb4. Sin FKs duras (índices, como las otras migraciones).
--
-- DISEÑO: los premios NO son una tabla aparte — son los mismos PRODUCTOS de
-- inventario con campos de puntos/canje añadidos. Administración marca qué
-- productos son canjeables (es_canjeable=1) y el sistema calcula sus puntos.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) CONFIG GLOBAL — porcentaje de recompensa (editable por gerencia)
--    Una sola fila (id=1). El % NO se aplica retroactivo a canjes hechos.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `beneficios_config` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `porcentaje_recompensa` DECIMAL(6,3) NOT NULL DEFAULT 1.000 COMMENT 'En %, ej 1.000 = 1%',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `user_actua_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Semilla de la fila única (1%) si no existe
INSERT INTO `beneficios_config` (`id`, `porcentaje_recompensa`, `activo`)
SELECT 1, 1.000, 1
WHERE NOT EXISTS (SELECT 1 FROM `beneficios_config` WHERE `id` = 1);

-- Historial de cambios del porcentaje (trazabilidad de gerencia)
CREATE TABLE IF NOT EXISTS `beneficios_config_historial` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `porcentaje_anterior` DECIMAL(6,3) NULL,
  `porcentaje_nuevo` DECIMAL(6,3) NOT NULL,
  `motivo` VARCHAR(255) NULL,
  `user_crea_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_benefcfg_hist_fecha` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2) PRODUCTO — se le añaden los campos de canje/puntos (idempotente).
--    producto YA tiene: nombre, descripcion, precio_venta, precio_compra (costo),
--    stock_actual, categoria_id, flg_activo. Le faltan: imagen, codigo y lealtad.
--    puntos_necesarios se calcula al guardar: CEIL((precio_venta/(%/100))/100)*100.
-- ─────────────────────────────────────────────────────────────
SET @db := DATABASE();

SET @sql := (SELECT IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='producto' AND COLUMN_NAME='es_canjeable'),
  'ALTER TABLE `producto` ADD COLUMN `es_canjeable` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 = producto canjeable por puntos''',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (SELECT IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='producto' AND COLUMN_NAME='imagen_url'),
  'ALTER TABLE `producto` ADD COLUMN `imagen_url` VARCHAR(500) NULL',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (SELECT IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='producto' AND COLUMN_NAME='codigo'),
  'ALTER TABLE `producto` ADD COLUMN `codigo` VARCHAR(50) NULL',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (SELECT IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='producto' AND COLUMN_NAME='porcentaje_recompensa'),
  'ALTER TABLE `producto` ADD COLUMN `porcentaje_recompensa` DECIMAL(6,3) NULL COMMENT ''Si NULL usa el global de beneficios_config''',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (SELECT IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='producto' AND COLUMN_NAME='puntos_necesarios'),
  'ALTER TABLE `producto` ADD COLUMN `puntos_necesarios` INT NOT NULL DEFAULT 0 COMMENT ''Redondeado a múltiplo de 100''',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (SELECT IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='producto' AND COLUMN_NAME='puntos_manual'),
  'ALTER TABLE `producto` ADD COLUMN `puntos_manual` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 = admin fijó el puntaje a mano''',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Índice para listar rápido los canjeables
SET @sql := (SELECT IF(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='producto' AND INDEX_NAME='idx_producto_canjeable'),
  'ALTER TABLE `producto` ADD KEY `idx_producto_canjeable` (`es_canjeable`)',
  'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─────────────────────────────────────────────────────────────
-- 3) RESUMEN POR PACIENTE — lectura rápida de saldo/histórico/fracción.
--    El saldo "fuente de verdad" se deriva de los lotes de puntos_movimiento;
--    esta tabla se mantiene en sincronía para no recalcular en cada lectura.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `paciente_beneficios` (
  `paciente_id` INT NOT NULL COMMENT 'FK lógica -> paciente.id',
  `saldo_puntos` INT NOT NULL DEFAULT 0 COMMENT 'Puntos vigentes (no vencidos)',
  `puntos_historicos` INT NOT NULL DEFAULT 0 COMMENT 'Total acumulado histórico (solo acumulaciones)',
  `fraccion_acumulada` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Residuo < S/1 para completar puntos en pagos siguientes',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`paciente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4) PUNTOS_MOVIMIENTO — libro mayor (ledger). Núcleo del programa.
--    tipo: ACUMULACION | REVERSION | CANJE | VENCIMIENTO | AJUSTE
--    - ACUMULACION: puntos > 0, saldo_restante = puntos, fecha_vencimiento = +12m.
--    - CANJE/REVERSION/VENCIMIENTO: puntos < 0 (consumen lotes FIFO; saldo_restante NULL).
--    - AJUSTE: ± (manual, auditado).
--    Saldo del paciente = SUM(saldo_restante) de lotes ACUMULACION no vencidos y > 0.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `puntos_movimiento` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `paciente_id` INT NOT NULL,
  `tipo` VARCHAR(20) NOT NULL,
  `puntos` INT NOT NULL COMMENT 'Positivo acumula, negativo descuenta',
  `saldo_restante` INT NULL COMMENT 'Solo lotes ACUMULACION: puntos vivos de ESTE lote (FIFO)',
  `fecha_generacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_vencimiento` DATE NULL COMMENT 'Solo acumulaciones: +12 meses',
  `origen_tipo` VARCHAR(20) NULL COMMENT 'VENTA_PAGO | CANJE | NC | AJUSTE',
  `origen_id` BIGINT NULL COMMENT 'venta_servicio_pago.id / canje.id / etc.',
  `descripcion` VARCHAR(255) NULL,
  `user_crea_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pm_paciente` (`paciente_id`),
  KEY `idx_pm_tipo` (`tipo`),
  KEY `idx_pm_venc` (`fecha_vencimiento`),
  KEY `idx_pm_lotes_vivos` (`paciente_id`, `tipo`, `saldo_restante`),
  KEY `idx_pm_origen` (`origen_tipo`, `origen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5) CANJE — canje de un PRODUCTO canjeable en recepción.
--    Descuenta inventario (producto.stock_actual) y genera un
--    puntos_movimiento tipo CANJE. Anulación restituye puntos e inventario.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `canje` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `paciente_id` INT NOT NULL,
  `producto_id` INT NOT NULL COMMENT 'FK lógica -> producto.id (el premio canjeado)',
  `cantidad` INT NOT NULL DEFAULT 1,
  `puntos_utilizados` INT NOT NULL,
  `estado` VARCHAR(20) NOT NULL DEFAULT 'ENTREGADO' COMMENT 'ENTREGADO | ANULADO',
  `colaborador_id` INT NULL COMMENT 'Quien atiende el canje (recepción)',
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `motivo_anulacion` VARCHAR(255) NULL,
  `anulado_por` INT NULL,
  `anulado_at` DATETIME NULL,
  `user_crea_id` INT NULL,
  `user_actua_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_canje_paciente` (`paciente_id`),
  KEY `idx_canje_producto` (`producto_id`),
  KEY `idx_canje_estado` (`estado`),
  KEY `idx_canje_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
