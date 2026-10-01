-- ============================================================================
-- MESA DE PARTES VIRTUAL — migración
-- Centro de Terapias
--
-- Recepción registra solicitudes que el apoderado entrega presencialmente,
-- el administrador las responde, y todo queda en una bitácora inmutable.
--
-- Tablas:
--   mesa_partes_estado        catálogo de estados
--   mesa_partes_tipo_evento   catálogo de tipos de acción (para la bitácora)
--   mesa_partes_tipo          catálogo de tipos de solicitud
--   mesa_partes_solicitud     cabecera (expediente + estado actual)
--   mesa_partes_evento        bitácora inmutable (solo-insertar: quién/cuándo/qué)
--   mesa_partes_adjunto       archivos (documento físico y respuestas)
--
-- Auditoría estándar (tablas transaccionales): user_crea_id, user_actua_id,
--   created_at, updated_at  → FK a trabajador_centro
-- FKs de negocio: paciente(id), trabajador_centro(id)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1) Catálogo de ESTADOS  (tabla de referencia, sin auditoría)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesa_partes_estado (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  codigo  VARCHAR(20)  NOT NULL UNIQUE,   -- para usar en código (RECEPCIONADA, ...)
  nombre  VARCHAR(50)  NOT NULL,          -- para mostrar en pantalla
  orden   INT          NOT NULL DEFAULT 0,
  activo  TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mesa_partes_estado (codigo, nombre, orden) VALUES
  ('RECEPCIONADA', 'Recepcionada', 1),   -- recién registrada por recepción
  ('OBSERVADA',    'Observada',    2),   -- el admin pidió corrección
  ('RECHAZADA',    'Rechazada',    3),   -- el admin no la aprobó (con motivo)
  ('ATENDIDA',     'Atendida',     4),   -- el admin la resolvió a favor
  ('NOTIFICADA',   'Notificada',   5),   -- recepción ya avisó al apoderado
  ('CERRADA',      'Cerrada',      6);   -- entregada / cerrada

-- ----------------------------------------------------------------------------
-- 2) Catálogo de TIPOS DE EVENTO  (tabla de referencia, sin auditoría)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesa_partes_tipo_evento (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  codigo  VARCHAR(20) NOT NULL UNIQUE,
  nombre  VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mesa_partes_tipo_evento (codigo, nombre) VALUES
  ('RECEPCION',    'Recepción'),      -- se registró el documento
  ('OBSERVACION',  'Observación'),    -- se pidió corrección
  ('RESPUESTA',    'Respuesta'),      -- el admin respondió (atendida)
  ('RECHAZO',      'Rechazo'),        -- el admin rechazó (con motivo)
  ('NOTIFICACION', 'Notificación'),   -- recepción avisó al apoderado
  ('ENTREGA',      'Entrega'),        -- se entregó la respuesta / se cerró
  ('COMENTARIO',   'Comentario'),     -- nota interna
  ('ADJUNTO',      'Adjunto');        -- se subió un archivo

-- ----------------------------------------------------------------------------
-- 3) Catálogo de TIPOS DE SOLICITUD  (tabla de referencia, sin auditoría)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesa_partes_tipo (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL,
  activo  TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mesa_partes_tipo (nombre) VALUES
  ('Justificación de falta'),
  ('Solicitud de constancia'),
  ('Solicitud de informe'),
  ('Reprogramación de cita'),
  ('Cambio de terapeuta'),
  ('Permiso / Vacaciones'),
  ('Reclamo o sugerencia'),
  ('Otro');

-- ----------------------------------------------------------------------------
-- 4) Cabecera del expediente
--    user_crea_id  = recepción que registró
--    respondido_por = administrador que respondió (dato de negocio)
--    estado_id = foto del último evento (para listar/filtrar rápido);
--    la verdad vive en mesa_partes_evento.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesa_partes_solicitud (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  numero_expediente        VARCHAR(30) NOT NULL UNIQUE,     -- ej: 2026-00042

  -- A qué paciente se refiere (opcional)
  paciente_id              INT NULL,

  -- Qué pide
  tipo_id                  INT NOT NULL,
  descripcion              TEXT NOT NULL,

  -- Quién entrega el documento (el apoderado, no es usuario del sistema)
  entregado_por_nombre     VARCHAR(150) NOT NULL,
  entregado_por_doc        VARCHAR(20)  NULL,
  entregado_por_telefono   VARCHAR(20)  NULL,

  -- Estado actual (catálogo)
  estado_id                INT NOT NULL,

  -- Respuesta vigente del admin (texto o motivo de rechazo)
  respuesta                TEXT NULL,
  respondido_por           INT NULL,       -- trabajador_centro (administrador)
  fecha_respuesta          DATETIME NULL,

  activo                   TINYINT(1) NOT NULL DEFAULT 1,   -- anulación lógica

  -- Auditoría estándar
  user_crea_id             INT NOT NULL,   -- recepción que registró
  user_actua_id            INT NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_mp_sol_tipo      FOREIGN KEY (tipo_id)        REFERENCES mesa_partes_tipo(id),
  CONSTRAINT fk_mp_sol_estado    FOREIGN KEY (estado_id)      REFERENCES mesa_partes_estado(id),
  CONSTRAINT fk_mp_sol_paciente  FOREIGN KEY (paciente_id)    REFERENCES paciente(id),
  CONSTRAINT fk_mp_sol_responde  FOREIGN KEY (respondido_por) REFERENCES trabajador_centro(id),
  CONSTRAINT fk_mp_sol_crea      FOREIGN KEY (user_crea_id)   REFERENCES trabajador_centro(id),
  CONSTRAINT fk_mp_sol_actua     FOREIGN KEY (user_actua_id)  REFERENCES trabajador_centro(id),

  INDEX idx_mp_sol_estado   (estado_id),
  INDEX idx_mp_sol_paciente (paciente_id),
  INDEX idx_mp_sol_fecha    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5) Bitácora inmutable — una fila por cada acción. NUNCA se edita ni borra.
--    Una corrección se registra como un evento nuevo.
--    user_crea_id = quién hizo la acción · created_at = cuándo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesa_partes_evento (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id       INT NOT NULL,
  tipo_evento_id     INT NOT NULL,

  estado_anterior_id INT NULL,
  estado_nuevo_id    INT NULL,
  comentario         TEXT NULL,

  -- Auditoría estándar (en bitácora inmutable actua/updated no cambian)
  user_crea_id       INT NOT NULL,   -- quién hizo la acción
  user_actua_id      INT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_mp_evt_sol    FOREIGN KEY (solicitud_id)       REFERENCES mesa_partes_solicitud(id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_evt_tipo   FOREIGN KEY (tipo_evento_id)     REFERENCES mesa_partes_tipo_evento(id),
  CONSTRAINT fk_mp_evt_estant FOREIGN KEY (estado_anterior_id) REFERENCES mesa_partes_estado(id),
  CONSTRAINT fk_mp_evt_estnue FOREIGN KEY (estado_nuevo_id)    REFERENCES mesa_partes_estado(id),
  CONSTRAINT fk_mp_evt_crea   FOREIGN KEY (user_crea_id)       REFERENCES trabajador_centro(id),
  CONSTRAINT fk_mp_evt_actua  FOREIGN KEY (user_actua_id)      REFERENCES trabajador_centro(id),

  INDEX idx_mp_evt_sol   (solicitud_id),
  INDEX idx_mp_evt_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6) Adjuntos — documento físico escaneado y documentos de respuesta.
--    evento_id enlaza el archivo con la acción que lo subió.
--    user_crea_id = quién subió el archivo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesa_partes_adjunto (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id   INT NOT NULL,
  evento_id      INT NULL,

  nombre_archivo VARCHAR(255) NOT NULL,
  ruta           VARCHAR(500) NOT NULL,
  tipo_mime      VARCHAR(100) NULL,
  tamano         INT NULL,

  -- Auditoría estándar
  user_crea_id   INT NOT NULL,   -- quién subió el archivo
  user_actua_id  INT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_mp_adj_sol   FOREIGN KEY (solicitud_id) REFERENCES mesa_partes_solicitud(id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_adj_evt   FOREIGN KEY (evento_id)    REFERENCES mesa_partes_evento(id) ON DELETE SET NULL,
  CONSTRAINT fk_mp_adj_crea  FOREIGN KEY (user_crea_id) REFERENCES trabajador_centro(id),
  CONSTRAINT fk_mp_adj_actua FOREIGN KEY (user_actua_id) REFERENCES trabajador_centro(id),

  INDEX idx_mp_adj_sol (solicitud_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- FIN migración mesa de partes
-- ============================================================================
