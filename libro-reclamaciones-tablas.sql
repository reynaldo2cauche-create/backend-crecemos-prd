-- =====================================================
-- LIBRO DE RECLAMACIONES VIRTUAL - INDECOPI
-- Sistema completo según normativa peruana
-- Centro Crecemos es el PROVEEDOR
-- =====================================================

-- =====================================================
-- TABLAS MAESTRAS (CATÁLOGOS)
-- =====================================================

-- 1. TIPO DE SOLICITUD
CREATE TABLE `libro_reclamaciones_tipo_solicitud` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(20) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL COMMENT 'Explicación según INDECOPI',
  `orden` INT(11) NOT NULL DEFAULT 0,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TIPO DE BIEN CONTRATADO
CREATE TABLE `libro_reclamaciones_tipo_bien` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(20) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `orden` INT(11) NOT NULL DEFAULT 0,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ESTADO DEL RECLAMO
CREATE TABLE `libro_reclamaciones_estado` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(30) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `color` VARCHAR(20) NULL COMMENT 'Para UI: success, warning, info, danger',
  `orden` INT(11) NOT NULL DEFAULT 0,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TIPO DE ACCIÓN (para seguimiento/historial)
CREATE TABLE `libro_reclamaciones_tipo_accion` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(30) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TIPO DE DOCUMENTO ADJUNTO
CREATE TABLE `libro_reclamaciones_tipo_documento_adjunto` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(20) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA PRINCIPAL DE RECLAMOS
-- =====================================================

CREATE TABLE `libro_reclamaciones` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- NÚMERO CORRELATIVO ÚNICO (Formato: RC-YYYYMMDD-0001)
  `numero_reclamo` VARCHAR(50) NOT NULL UNIQUE,

  -- TIPO DE SOLICITUD (FK a tabla maestra)
  `tipo_solicitud_id` INT(11) NOT NULL,

  -- ===== DATOS DEL CONSUMIDOR/CLIENTE =====
  `tipo_documento_id` INT(11) NOT NULL COMMENT 'FK a tabla tipo_documento existente',
  `numero_documento` VARCHAR(20) NOT NULL,
  `nombre_completo` VARCHAR(200) NOT NULL,
  `domicilio` VARCHAR(300) NOT NULL,
  `departamento` VARCHAR(100) NULL,
  `provincia` VARCHAR(100) NULL,
  `distrito` VARCHAR(100) NULL,
  `telefono` VARCHAR(20) NULL,
  `correo_electronico` VARCHAR(150) NOT NULL,

  -- ===== IDENTIFICACIÓN DEL BIEN CONTRATADO =====
  `tipo_bien_id` INT(11) NOT NULL COMMENT 'FK: PRODUCTO o SERVICIO',
  `descripcion_bien` TEXT NOT NULL COMMENT 'Descripción del producto o servicio',
  `monto_reclamado` DECIMAL(10, 2) NULL COMMENT 'Monto en caso de reclamo económico',

  -- ===== DETALLE DEL RECLAMO =====
  `detalle_reclamo` TEXT NOT NULL COMMENT 'Descripción detallada del reclamo',
  `pedido_consumidor` TEXT NOT NULL COMMENT 'Lo que solicita el consumidor',

  -- ===== RESPUESTA DEL PROVEEDOR =====
  `observaciones_proveedor` TEXT NULL COMMENT 'Observaciones y comentarios del proveedor',
  `acciones_adoptadas` TEXT NULL COMMENT 'Acciones correctivas tomadas',
  `fecha_respuesta` DATETIME NULL,
  `usuario_responde_id` INT(11) NULL COMMENT 'ID del trabajador que responde',

  -- ===== ESTADO Y SEGUIMIENTO =====
  `estado` ENUM('REGISTRADO', 'EN_REVISION', 'RESPONDIDO', 'CERRADO') NOT NULL DEFAULT 'REGISTRADO',
  `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_limite_respuesta` DATETIME NOT NULL COMMENT 'Plazo legal: 15 días calendario',
  `fecha_cierre` DATETIME NULL,

  -- ===== NOTIFICACIONES =====
  `correo_enviado` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Si se envió confirmación por correo',
  `fecha_envio_correo` DATETIME NULL,

  -- ===== AUDITORÍA =====
  `ip_registro` VARCHAR(50) NULL COMMENT 'IP desde donde se registró',
  `user_agent` VARCHAR(500) NULL COMMENT 'Navegador/dispositivo usado',
  `usuario_cierra_id` INT(11) NULL COMMENT 'ID del trabajador que cierra',
  `observacion_cierre` TEXT NULL,

  -- ===== CONTROL =====
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Activo, 0=Eliminado',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- ÍNDICES PARA BÚSQUEDAS RÁPIDAS
  INDEX `idx_numero_reclamo` (`numero_reclamo`),
  INDEX `idx_numero_documento` (`numero_documento`),
  INDEX `idx_estado` (`estado`),
  INDEX `idx_fecha_registro` (`fecha_registro`),
  INDEX `idx_tipo_solicitud` (`tipo_solicitud`),
  INDEX `idx_correo` (`correo_electronico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA DE DOCUMENTOS ADJUNTOS
CREATE TABLE `libro_reclamaciones_documentos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `reclamo_id` INT(11) NOT NULL,

  -- INFORMACIÓN DEL ARCHIVO
  `nombre_original` VARCHAR(255) NOT NULL,
  `nombre_archivo` VARCHAR(255) NOT NULL COMMENT 'Nombre único en el servidor',
  `ruta_archivo` VARCHAR(500) NOT NULL,
  `tipo_mime` VARCHAR(100) NOT NULL,
  `tamanio_bytes` INT(11) NOT NULL,

  -- TIPO DE DOCUMENTO
  `tipo_documento` ENUM('COMPROBANTE', 'FOTO', 'OTRO') NOT NULL DEFAULT 'OTRO',
  `descripcion` VARCHAR(500) NULL,

  -- AUDITORÍA
  `fecha_subida` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `flg_activo` TINYINT(1) NOT NULL DEFAULT 1,

  -- RELACIONES
  FOREIGN KEY (`reclamo_id`) REFERENCES `libro_reclamaciones`(`id`) ON DELETE CASCADE,
  INDEX `idx_reclamo_id` (`reclamo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA DE SEGUIMIENTO/HISTORIAL
CREATE TABLE `libro_reclamaciones_seguimiento` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `reclamo_id` INT(11) NOT NULL,

  -- INFORMACIÓN DEL CAMBIO
  `accion` ENUM('REGISTRO', 'CAMBIO_ESTADO', 'RESPUESTA', 'CIERRE', 'NOTIFICACION', 'OTRO') NOT NULL,
  `estado_anterior` VARCHAR(50) NULL,
  `estado_nuevo` VARCHAR(50) NULL,
  `descripcion` TEXT NOT NULL,
  `observaciones` TEXT NULL,

  -- USUARIO Y FECHA
  `usuario_id` INT(11) NULL COMMENT 'ID del trabajador (NULL si es registro público)',
  `fecha_accion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- RELACIONES
  FOREIGN KEY (`reclamo_id`) REFERENCES `libro_reclamaciones`(`id`) ON DELETE CASCADE,
  INDEX `idx_reclamo_id` (`reclamo_id`),
  INDEX `idx_fecha_accion` (`fecha_accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA DE CONFIGURACIÓN
CREATE TABLE `libro_reclamaciones_config` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- DATOS DE LA EMPRESA (PROVEEDOR)
  `razon_social` VARCHAR(200) NOT NULL,
  `ruc` VARCHAR(11) NOT NULL,
  `direccion_empresa` VARCHAR(300) NOT NULL,
  `departamento_empresa` VARCHAR(100) NOT NULL,
  `provincia_empresa` VARCHAR(100) NOT NULL,
  `distrito_empresa` VARCHAR(100) NOT NULL,
  `telefono_empresa` VARCHAR(20) NULL,
  `email_empresa` VARCHAR(150) NULL,
  `web_empresa` VARCHAR(200) NULL,

  -- CONFIGURACIÓN DE PLAZOS
  `dias_plazo_respuesta` INT(11) NOT NULL DEFAULT 15 COMMENT 'Días hábiles para responder (INDECOPI: 15 días calendario)',

  -- CONFIGURACIÓN DE CORREOS
  `email_notificaciones` VARCHAR(150) NULL COMMENT 'Email para recibir notificaciones de nuevos reclamos',
  `asunto_correo_confirmacion` VARCHAR(200) NULL,
  `plantilla_correo_confirmacion` TEXT NULL,

  -- NUMERACIÓN
  `ultimo_numero_correlativo` INT(11) NOT NULL DEFAULT 0,
  `prefijo_numero` VARCHAR(10) NOT NULL DEFAULT 'RC',

  -- CONTROL
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERTS INICIALES
-- =====================================================

-- Insertar configuración inicial (ajustar según tu empresa)
INSERT INTO `libro_reclamaciones_config` (
  `razon_social`,
  `ruc`,
  `direccion_empresa`,
  `departamento_empresa`,
  `provincia_empresa`,
  `distrito_empresa`,
  `telefono_empresa`,
  `email_empresa`,
  `web_empresa`,
  `dias_plazo_respuesta`,
  `email_notificaciones`,
  `ultimo_numero_correlativo`,
  `prefijo_numero`
) VALUES (
  'CENTRO CRECEMOS',
  '20XXXXXXXXX',
  'Av. Principal 123',
  'Lima',
  'Lima',
  'Miraflores',
  '01-1234567',
  'contacto@centrocrecemos.com',
  'www.centrocrecemos.com',
  15,
  'reclamos@centrocrecemos.com',
  0,
  'RC'
);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de reclamos con información completa
CREATE VIEW `v_libro_reclamaciones_completo` AS
SELECT
  lr.id,
  lr.numero_reclamo,
  lr.tipo_solicitud,
  lr.tipo_documento,
  lr.numero_documento,
  lr.nombre_completo,
  lr.correo_electronico,
  lr.telefono,
  lr.tipo_bien,
  lr.descripcion_bien,
  lr.detalle_reclamo,
  lr.pedido_consumidor,
  lr.estado,
  lr.fecha_registro,
  lr.fecha_limite_respuesta,
  lr.fecha_respuesta,
  lr.fecha_cierre,
  lr.observaciones_proveedor,
  lr.acciones_adoptadas,
  -- Calcular días transcurridos
  DATEDIFF(CURRENT_TIMESTAMP, lr.fecha_registro) AS dias_transcurridos,
  -- Calcular días para vencimiento
  DATEDIFF(lr.fecha_limite_respuesta, CURRENT_TIMESTAMP) AS dias_para_vencer,
  -- Usuario que respondió
  CONCAT(tc.nombres, ' ', tc.apellidos) AS usuario_responde,
  -- Contar documentos adjuntos
  (SELECT COUNT(*) FROM libro_reclamaciones_documentos WHERE reclamo_id = lr.id AND flg_activo = 1) AS total_documentos
FROM libro_reclamaciones lr
LEFT JOIN trabajador_centro tc ON lr.usuario_responde_id = tc.id
WHERE lr.flg_activo = 1;

-- =====================================================
-- STORED PROCEDURE: GENERAR NÚMERO CORRELATIVO
-- =====================================================

DELIMITER $$

CREATE PROCEDURE `sp_generar_numero_reclamo`()
BEGIN
  DECLARE nuevo_numero INT;
  DECLARE prefijo VARCHAR(10);
  DECLARE fecha_formato VARCHAR(8);
  DECLARE numero_final VARCHAR(50);

  -- Obtener configuración
  SELECT ultimo_numero_correlativo + 1, prefijo_numero
  INTO nuevo_numero, prefijo
  FROM libro_reclamaciones_config
  WHERE activo = 1
  LIMIT 1;

  -- Formato de fecha: YYYYMMDD
  SET fecha_formato = DATE_FORMAT(NOW(), '%Y%m%d');

  -- Generar número: RC-YYYYMMDD-0001
  SET numero_final = CONCAT(prefijo, '-', fecha_formato, '-', LPAD(nuevo_numero, 4, '0'));

  -- Actualizar contador
  UPDATE libro_reclamaciones_config
  SET ultimo_numero_correlativo = nuevo_numero
  WHERE activo = 1;

  -- Retornar el número generado
  SELECT numero_final;
END$$

DELIMITER ;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
-- Este esquema cumple con los requisitos de INDECOPI para el
-- Libro de Reclamaciones Virtual según el Código de Protección
-- y Defensa del Consumidor (Ley N° 29571)
--
-- Características principales:
-- ✓ Número correlativo único automático
-- ✓ Diferenciación entre RECLAMO y QUEJA
-- ✓ Datos completos del consumidor
-- ✓ Identificación del bien (producto/servicio)
-- ✓ Registro de respuesta del proveedor
-- ✓ Control de plazos (15 días calendario)
-- ✓ Seguimiento completo (historial)
-- ✓ Documentos adjuntos
-- ✓ Sistema de consulta por número y documento
-- ✓ Notificaciones por correo
-- ✓ Auditoría completa
-- =====================================================
