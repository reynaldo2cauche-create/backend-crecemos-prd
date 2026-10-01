-- =====================================================
-- MIGRACIÓN: Ficha de Seguimiento Escolar (Terapia de Lenguaje)
--
-- Qué hace:
--   Crea la tabla ficha_seguimiento_escolar. Admisión/Administrador genera una
--   solicitud por paciente (estado PENDIENTE) que produce un token único; la docente
--   abre el link público /ficha-seguimiento/<token>, la llena UNA sola vez y queda
--   COMPLETADA (el link ya no permite editar, como un Google Form de un solo uso).
--
--   Cada pregunta del formato es UNA columna (sin JSON):
--     - Ítems de escala: columna ENUM('L','EP','N') + su columna `<col>_obs` (observación).
--     - Opciones marcables (checkbox): columna BOOLEAN.
--     - Campos de texto libre: columna TEXT/VARCHAR.
-- =====================================================

CREATE TABLE IF NOT EXISTS ficha_seguimiento_escolar (
  id                     INT NOT NULL AUTO_INCREMENT,
  paciente_id            INT NOT NULL                COMMENT 'Estudiante evaluado',
  token                  VARCHAR(64) NOT NULL        COMMENT 'Token único del link público (un solo uso)',
  estado                 ENUM('PENDIENTE','COMPLETADA') NOT NULL DEFAULT 'PENDIENTE',

  -- Cabecera opcional definida por Admisión al generar
  periodo_observacion    TEXT NULL                   COMMENT 'Ej. "Octubre 2026"',
  fecha_entrega          DATE NULL                   COMMENT 'Fecha de entrega a la docente',
  fecha_devolucion       DATE NULL                   COMMENT 'Fecha de devolución',

  -- Cabecera que llena la docente
  docente_nombre         TEXT NULL,
  aula                   TEXT NULL,
  institucion_educativa  TEXT NULL,

  -- ── COMUNICACIÓN FUNCIONAL ──
  cf1 ENUM('L','EP','N') NULL, cf1_obs TEXT NULL,
  cf2 ENUM('L','EP','N') NULL, cf2_obs TEXT NULL,
  cf3 ENUM('L','EP','N') NULL, cf3_obs TEXT NULL,
  cf4 ENUM('L','EP','N') NULL, cf4_obs TEXT NULL,
  cf5 ENUM('L','EP','N') NULL, cf5_obs TEXT NULL,
  cf6 ENUM('L','EP','N') NULL, cf6_obs TEXT NULL,

  -- ── COMPRENSIÓN DEL LENGUAJE ──
  cl1 ENUM('L','EP','N') NULL, cl1_obs TEXT NULL,
  cl2 ENUM('L','EP','N') NULL, cl2_obs TEXT NULL,
  cl3 ENUM('L','EP','N') NULL, cl3_obs TEXT NULL,
  cl4 ENUM('L','EP','N') NULL, cl4_obs TEXT NULL,
  cl5 ENUM('L','EP','N') NULL, cl5_obs TEXT NULL,

  -- ── VOCABULARIO Y LENGUAJE EXPRESIVO ──
  ve1 ENUM('L','EP','N') NULL, ve1_obs TEXT NULL,
  ve2 ENUM('L','EP','N') NULL, ve2_obs TEXT NULL,
  ve3 ENUM('L','EP','N') NULL, ve3_obs TEXT NULL,
  ve4 ENUM('L','EP','N') NULL, ve4_obs TEXT NULL,
  ve5 ENUM('L','EP','N') NULL, ve5_obs TEXT NULL,

  -- ── INTERACCIÓN Y COMUNICACIÓN SOCIAL ──
  is1 ENUM('L','EP','N') NULL, is1_obs TEXT NULL,
  is2 ENUM('L','EP','N') NULL, is2_obs TEXT NULL,
  is3 ENUM('L','EP','N') NULL, is3_obs TEXT NULL,
  is4 ENUM('L','EP','N') NULL, is4_obs TEXT NULL,
  is5 ENUM('L','EP','N') NULL, is5_obs TEXT NULL,
  is6 ENUM('L','EP','N') NULL, is6_obs TEXT NULL,

  -- ── JUEGO E IMITACIÓN ──
  ji1 ENUM('L','EP','N') NULL, ji1_obs TEXT NULL,
  ji2 ENUM('L','EP','N') NULL, ji2_obs TEXT NULL,
  ji3 ENUM('L','EP','N') NULL, ji3_obs TEXT NULL,
  ji4 ENUM('L','EP','N') NULL, ji4_obs TEXT NULL,
  ji5 ENUM('L','EP','N') NULL, ji5_obs TEXT NULL,

  -- ── REGISTRO DE LENGUAJE ESPONTÁNEO ──
  palabras_espontaneas    TEXT NULL,
  frases_escuchadas       TEXT NULL,
  usa_pedir_objetos       BOOLEAN NOT NULL DEFAULT 0,
  usa_pedir_ayuda         BOOLEAN NOT NULL DEFAULT 0,
  usa_rechazar            BOOLEAN NOT NULL DEFAULT 0,
  usa_elegir              BOOLEAN NOT NULL DEFAULT 0,
  usa_llamar_persona      BOOLEAN NOT NULL DEFAULT 0,
  usa_responder_preguntas BOOLEAN NOT NULL DEFAULT 0,
  usa_comentar_espontaneo BOOLEAN NOT NULL DEFAULT 0,
  usa_otro                TEXT NULL,

  -- ── INTERACCIÓN CON COMPAÑEROS (juego libre) ──
  jl_juega_solo     BOOLEAN NOT NULL DEFAULT 0,
  jl_cerca_otros    BOOLEAN NOT NULL DEFAULT 0,
  jl_observa_imita  BOOLEAN NOT NULL DEFAULT 0,
  jl_permite_otros  BOOLEAN NOT NULL DEFAULT 0,
  jl_busca_otros    BOOLEAN NOT NULL DEFAULT 0,
  jl_juegos_turnos  BOOLEAN NOT NULL DEFAULT 0,
  jl_ejemplo        TEXT NULL,

  -- ── ESTRATEGIAS QUE MEJOR FUNCIONAN ──
  est_pausa_expectante    BOOLEAN NOT NULL DEFAULT 0,
  est_frases_breves       BOOLEAN NOT NULL DEFAULT 0,
  est_una_indicacion      BOOLEAN NOT NULL DEFAULT 0,
  est_mostrar_visual      BOOLEAN NOT NULL DEFAULT 0,
  est_modelar_palabra     BOOLEAN NOT NULL DEFAULT 0,
  est_materiales_interes  BOOLEAN NOT NULL DEFAULT 0,
  est_dos_alternativas    BOOLEAN NOT NULL DEFAULT 0,
  est_incorporarse_juego  BOOLEAN NOT NULL DEFAULT 0,
  est_canciones_movimiento BOOLEAN NOT NULL DEFAULT 0,
  est_otro                TEXT NULL,

  -- ── Metadatos ──
  user_id_crea           INT NULL                    COMMENT 'Quién generó la solicitud',
  fecha_crea             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_completado       DATETIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_ficha_seguimiento_token (token),
  KEY idx_ficha_seguimiento_paciente (paciente_id),
  CONSTRAINT fk_ficha_seguimiento_paciente
    FOREIGN KEY (paciente_id) REFERENCES paciente (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
