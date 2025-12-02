-- ============================================
-- SISTEMA DE AUDITORÍA Y ALERTAS
-- Centro Crecemos
-- Fecha: 2025-12-02
-- ============================================

-- ============================================
-- TABLA: auditoria_acciones
-- Descripción: Registra todas las acciones que realizan los usuarios en el sistema
-- ============================================

CREATE TABLE IF NOT EXISTS `auditoria_acciones` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- Usuario que realizó la acción
  `trabajador_id` INT NOT NULL,
  `trabajador_nombre` VARCHAR(255) NOT NULL,
  `trabajador_username` VARCHAR(100) NOT NULL,
  `trabajador_rol` VARCHAR(100),

  -- Qué hizo
  `accion` VARCHAR(100) NOT NULL COMMENT 'Ej: VER_PACIENTE, EDITAR_PACIENTE, CREAR_CERTIFICADO',
  `modulo` VARCHAR(50) NOT NULL COMMENT 'Ej: PACIENTES, CITAS, ARCHIVOS, RRHH',

  -- Sobre qué entidad/recurso
  `entidad_tipo` VARCHAR(50) COMMENT 'Ej: Paciente, Cita, Certificado',
  `entidad_id` INT COMMENT 'ID del registro afectado',
  `entidad_nombre` VARCHAR(255) COMMENT 'Nombre descriptivo del recurso',

  -- Detalles de la acción
  `descripcion` TEXT NOT NULL COMMENT 'Descripción legible para humanos',
  `datos_anteriores` JSON COMMENT 'Estado anterior (para ediciones)',
  `datos_nuevos` JSON COMMENT 'Estado nuevo (para creaciones/ediciones)',

  -- Metadatos técnicos
  `ip_address` VARCHAR(50),
  `user_agent` TEXT,
  `metodo_http` VARCHAR(10) COMMENT 'GET, POST, PUT, PATCH, DELETE',
  `endpoint` VARCHAR(255) COMMENT 'URL del endpoint llamado',
  `codigo_respuesta` INT COMMENT 'Código HTTP de respuesta',

  -- Auditoría temporal
  `fecha_hora` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Índices
  INDEX `idx_trabajador` (`trabajador_id`),
  INDEX `idx_fecha` (`fecha_hora`),
  INDEX `idx_modulo` (`modulo`),
  INDEX `idx_accion` (`accion`),
  INDEX `idx_entidad` (`entidad_tipo`, `entidad_id`),
  INDEX `idx_trabajador_fecha` (`trabajador_id`, `fecha_hora`),

  CONSTRAINT `fk_auditoria_trabajador`
    FOREIGN KEY (`trabajador_id`)
    REFERENCES `trabajador_centro`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de auditoría de todas las acciones de usuarios';


-- ============================================
-- TABLA: alertas_sistema
-- Descripción: Notificaciones de actividades sospechosas o inusuales
-- ============================================

CREATE TABLE IF NOT EXISTS `alertas_sistema` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- Tipo y severidad
  `tipo` VARCHAR(50) NOT NULL COMMENT 'Ej: ACCESO_SOSPECHOSO, ACTIVIDAD_INUSUAL, MODIFICACION_CRITICA',
  `severidad` ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',

  -- Usuario relacionado
  `trabajador_id` INT,
  `trabajador_nombre` VARCHAR(255),

  -- Detalles de la alerta
  `titulo` VARCHAR(255) NOT NULL,
  `mensaje` TEXT NOT NULL,
  `contexto` JSON COMMENT 'Información adicional de contexto',

  -- Auditoría relacionada
  `auditoria_id` INT COMMENT 'Referencia a la acción que generó la alerta',

  -- Estado de la alerta
  `leida` BOOLEAN NOT NULL DEFAULT FALSE,
  `resuelta` BOOLEAN NOT NULL DEFAULT FALSE,
  `fecha_leida` TIMESTAMP NULL,
  `fecha_resuelta` TIMESTAMP NULL,
  `resuelto_por` INT COMMENT 'ID del admin que resolvió',
  `comentarios_resolucion` TEXT,

  -- Auditoría temporal
  `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Índices
  INDEX `idx_tipo` (`tipo`),
  INDEX `idx_severidad` (`severidad`),
  INDEX `idx_trabajador` (`trabajador_id`),
  INDEX `idx_leida` (`leida`),
  INDEX `idx_resuelta` (`resuelta`),
  INDEX `idx_fecha` (`fecha_creacion`),
  INDEX `idx_no_leidas` (`leida`, `severidad`, `fecha_creacion`),

  CONSTRAINT `fk_alerta_trabajador`
    FOREIGN KEY (`trabajador_id`)
    REFERENCES `trabajador_centro`(`id`)
    ON DELETE SET NULL,

  CONSTRAINT `fk_alerta_auditoria`
    FOREIGN KEY (`auditoria_id`)
    REFERENCES `auditoria_acciones`(`id`)
    ON DELETE SET NULL,

  CONSTRAINT `fk_alerta_resuelto_por`
    FOREIGN KEY (`resuelto_por`)
    REFERENCES `trabajador_centro`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Alertas y notificaciones del sistema de auditoría';


-- ============================================
-- TABLA: configuracion_alertas
-- Descripción: Configuración de reglas para generación automática de alertas
-- ============================================

CREATE TABLE IF NOT EXISTS `configuracion_alertas` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre de la regla',
  `tipo_alerta` VARCHAR(50) NOT NULL,
  `descripcion` TEXT,

  -- Condiciones de la regla
  `condicion_tipo` VARCHAR(50) NOT NULL COMMENT 'Ej: UMBRAL_CANTIDAD, HORARIO, CAMPO_CRITICO',
  `condicion_valor` JSON NOT NULL COMMENT 'Configuración específica de la condición',

  -- Estado de la regla
  `activa` BOOLEAN NOT NULL DEFAULT TRUE,
  `severidad` ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',

  -- Auditoría
  `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_activa` (`activa`),
  INDEX `idx_tipo` (`tipo_alerta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configuración de reglas de alertas automáticas';


-- ============================================
-- INSERTAR CONFIGURACIONES PREDETERMINADAS
-- ============================================

INSERT INTO `configuracion_alertas` (`nombre`, `tipo_alerta`, `descripcion`, `condicion_tipo`, `condicion_valor`, `severidad`) VALUES
('Descargas masivas', 'ACTIVIDAD_INUSUAL', 'Detecta cuando un usuario descarga más de 20 archivos en 30 minutos', 'UMBRAL_CANTIDAD',
 JSON_OBJECT('limite', 20, 'ventana_minutos', 30, 'accion', 'DESCARGAR_ARCHIVO'), 'ALTA'),

('Acceso fuera de horario', 'ACCESO_SOSPECHOSO', 'Detecta accesos entre 12:00 AM y 6:00 AM', 'HORARIO',
 JSON_OBJECT('hora_inicio', '00:00:00', 'hora_fin', '06:00:00'), 'MEDIA'),

('Modificación de sueldos', 'MODIFICACION_CRITICA', 'Alerta cuando se modifican sueldos de empleados', 'CAMPO_CRITICO',
 JSON_OBJECT('modulo', 'RRHH', 'accion', 'EDITAR_EMPLEADO', 'campo', 'sueldo_base'), 'CRITICA'),

('Intentos de login fallidos', 'ACCESO_SOSPECHOSO', 'Detecta más de 3 intentos de login fallidos', 'UMBRAL_CANTIDAD',
 JSON_OBJECT('limite', 3, 'ventana_minutos', 15, 'accion', 'LOGIN_FALLIDO'), 'ALTA'),

('Eliminación masiva', 'ACTIVIDAD_INUSUAL', 'Detecta cuando se eliminan más de 5 registros en 10 minutos', 'UMBRAL_CANTIDAD',
 JSON_OBJECT('limite', 5, 'ventana_minutos', 10, 'metodo_http', 'DELETE'), 'ALTA'),

('Exportación de datos completos', 'ACTIVIDAD_INUSUAL', 'Detecta exportaciones masivas de datos', 'UMBRAL_CANTIDAD',
 JSON_OBJECT('limite', 100, 'accion', 'EXPORTAR_DATOS'), 'MEDIA'),

('Acceso sin permisos', 'ACCESO_SOSPECHOSO', 'Detecta intentos de acceso a módulos sin permisos', 'CODIGO_RESPUESTA',
 JSON_OBJECT('codigo', 403), 'ALTA'),

('Cambio de roles', 'MODIFICACION_CRITICA', 'Alerta cuando se modifican roles de usuarios', 'CAMPO_CRITICO',
 JSON_OBJECT('modulo', 'USUARIOS', 'accion', 'EDITAR_EMPLEADO', 'campo', 'rol_id'), 'CRITICA');


-- ============================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================

-- Índice compuesto para búsquedas frecuentes de auditoría
ALTER TABLE `auditoria_acciones`
ADD INDEX `idx_busqueda_completa` (`modulo`, `accion`, `fecha_hora`, `trabajador_id`);

-- Índice para consultas de actividad reciente por usuario
ALTER TABLE `auditoria_acciones`
ADD INDEX `idx_actividad_reciente` (`trabajador_id`, `fecha_hora` DESC, `modulo`);


-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Resumen de acciones por usuario
CREATE OR REPLACE VIEW `v_auditoria_resumen_usuario` AS
SELECT
  t.id AS trabajador_id,
  CONCAT(t.nombres, ' ', t.apellidos) AS trabajador_nombre,
  r.nombre AS rol,
  COUNT(a.id) AS total_acciones,
  COUNT(DISTINCT DATE(a.fecha_hora)) AS dias_activos,
  MAX(a.fecha_hora) AS ultima_actividad,
  COUNT(CASE WHEN a.fecha_hora >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) AS acciones_ultimas_24h,
  COUNT(CASE WHEN a.fecha_hora >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) AS acciones_ultima_semana
FROM trabajador_centro t
LEFT JOIN auditoria_acciones a ON t.id = a.trabajador_id
LEFT JOIN rol r ON t.rol_id = r.id
GROUP BY t.id, t.nombres, t.apellidos, r.nombre;


-- Vista: Alertas pendientes por severidad
CREATE OR REPLACE VIEW `v_alertas_pendientes` AS
SELECT
  severidad,
  COUNT(*) AS total,
  COUNT(CASE WHEN leida = FALSE THEN 1 END) AS no_leidas,
  COUNT(CASE WHEN resuelta = FALSE THEN 1 END) AS no_resueltas
FROM alertas_sistema
WHERE resuelta = FALSE
GROUP BY severidad
ORDER BY
  CASE severidad
    WHEN 'CRITICA' THEN 1
    WHEN 'ALTA' THEN 2
    WHEN 'MEDIA' THEN 3
    WHEN 'BAJA' THEN 4
  END;


-- Vista: Actividad por módulo
CREATE OR REPLACE VIEW `v_auditoria_por_modulo` AS
SELECT
  modulo,
  COUNT(*) AS total_acciones,
  COUNT(DISTINCT trabajador_id) AS usuarios_unicos,
  COUNT(CASE WHEN fecha_hora >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) AS acciones_hoy,
  MAX(fecha_hora) AS ultima_actividad
FROM auditoria_acciones
GROUP BY modulo
ORDER BY total_acciones DESC;


-- ============================================
-- PROCEDIMIENTO: Limpiar auditoría antigua
-- ============================================

DELIMITER //

CREATE PROCEDURE `sp_limpiar_auditoria_antigua`(IN dias_antiguedad INT)
BEGIN
  DECLARE registros_eliminados INT;

  -- Eliminar registros de auditoría más antiguos que X días
  DELETE FROM auditoria_acciones
  WHERE fecha_hora < DATE_SUB(NOW(), INTERVAL dias_antiguedad DAY)
  AND accion NOT IN ('LOGIN', 'LOGOUT', 'EDITAR_EMPLEADO', 'MODIFICACION_CRITICA');

  SET registros_eliminados = ROW_COUNT();

  -- Retornar resultado
  SELECT
    registros_eliminados AS registros_eliminados,
    COUNT(*) AS registros_restantes
  FROM auditoria_acciones;
END //

DELIMITER ;


-- ============================================
-- EVENTO: Limpiar auditoría automáticamente
-- (Ejecuta cada mes, elimina registros mayores a 6 meses)
-- ============================================

-- Habilitar el scheduler si no está habilitado
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS `evento_limpiar_auditoria`
ON SCHEDULE EVERY 1 MONTH
STARTS CURRENT_TIMESTAMP + INTERVAL 1 MONTH
DO
  CALL sp_limpiar_auditoria_antigua(180);


-- ============================================
-- FINALIZADO
-- ============================================

SELECT
  'Tablas creadas exitosamente:' AS mensaje,
  '' AS detalle
UNION ALL
SELECT '- auditoria_acciones', CONCAT('(', COUNT(*), ' registros)') FROM auditoria_acciones
UNION ALL
SELECT '- alertas_sistema', CONCAT('(', COUNT(*), ' registros)') FROM alertas_sistema
UNION ALL
SELECT '- configuracion_alertas', CONCAT('(', COUNT(*), ' registros)') FROM configuracion_alertas;
