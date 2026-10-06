-- =====================================================
-- MIGRACIÓN: Ficha de Seguimiento Escolar (Psicología) — Escala de Conners para Maestros
--
-- Qué hace:
--   Crea la tabla ficha_seguimiento_psicologia. Admisión/Administrador genera una
--   solicitud por paciente (estado PENDIENTE) que produce un token único; la docente
--   abre el link público /ficha-seguimiento-psicologia/<token>, la llena UNA sola vez
--   y queda COMPLETADA (el link ya no permite editar, como un Google Form de un solo uso).
--
--   Es el equivalente a ficha_seguimiento_escolar (Terapia de Lenguaje) pero para el
--   servicio de Psicología (infantil / adolescentes). Replica el "Cuestionario para
--   Maestros Conners" (Sattler, Evaluación Infantil): 39 reactivos en 3 bloques,
--   valorados con la escala Nunca=0, Sólo un poco=1, Bastante=2, Mucho=3.
--
--   Cada reactivo es UNA columna (sin JSON): TINYINT con valores 0..3 (NULL = sin responder).
--     - sc1..sc21  → Conducta en el salón de clases (21 reactivos)
--     - pg1..pg8   → Participación en grupo        (reactivos 22..29)
--     - aa1..aa10  → Actitud hacia la autoridad    (reactivos 30..39)
--   Más un campo de texto libre de comentarios.
-- =====================================================

CREATE TABLE IF NOT EXISTS ficha_seguimiento_psicologia (
  id                     INT NOT NULL AUTO_INCREMENT,
  paciente_id            INT NOT NULL                COMMENT 'Niño(a) evaluado',
  token                  VARCHAR(64) NOT NULL        COMMENT 'Token único del link público (un solo uso)',
  estado                 ENUM('PENDIENTE','COMPLETADA') NOT NULL DEFAULT 'PENDIENTE',

  -- Cabecera opcional definida por Admisión al generar
  periodo_observacion    TEXT NULL                   COMMENT 'Ej. "Octubre 2026"',
  fecha_entrega          DATE NULL                   COMMENT 'Fecha de entrega a la docente',
  fecha_devolucion       DATE NULL                   COMMENT 'Fecha de devolución / aplicación',

  -- Cabecera que llena la docente (Cuestionario para Maestros)
  docente_nombre         TEXT NULL                   COMMENT 'Nombre de los maestros',
  nivel_grado            TEXT NULL                   COMMENT 'Nivel y grado escolar',
  institucion_educativa  TEXT NULL                   COMMENT 'Nombre de la escuela',

  -- ── CONDUCTA EN EL SALÓN DE CLASES (reactivos 1..21) ──
  sc1  TINYINT NULL COMMENT 'Presenta nerviosismo constante',
  sc2  TINYINT NULL COMMENT 'Gruñe y hace otros ruidos extraños',
  sc3  TINYINT NULL COMMENT 'Sus demandas se deben satisfacer de manera inmediata, se frustra con facilidad',
  sc4  TINYINT NULL COMMENT 'Coordinación deficiente',
  sc5  TINYINT NULL COMMENT 'Inquieto o demasiado activo',
  sc6  TINYINT NULL COMMENT 'Excitable, impulsivo',
  sc7  TINYINT NULL COMMENT 'No presta atención, se distrae con facilidad',
  sc8  TINYINT NULL COMMENT 'No termina las cosas que empieza (períodos cortos de atención)',
  sc9  TINYINT NULL COMMENT 'Demasiado sensible',
  sc10 TINYINT NULL COMMENT 'Demasiado serio o triste',
  sc11 TINYINT NULL COMMENT 'Soñador',
  sc12 TINYINT NULL COMMENT 'Hosco o malhumorado',
  sc13 TINYINT NULL COMMENT 'Llora con frecuencia y fácilmente',
  sc14 TINYINT NULL COMMENT 'Molesta a otros niños',
  sc15 TINYINT NULL COMMENT 'Es pendenciero (propenso a buscar riñas)',
  sc16 TINYINT NULL COMMENT 'Su estado de ánimo cambia de manera rápida y drástica',
  sc17 TINYINT NULL COMMENT 'Es respondón',
  sc18 TINYINT NULL COMMENT 'Es destructivo',
  sc19 TINYINT NULL COMMENT 'Roba',
  sc20 TINYINT NULL COMMENT 'Miente',
  sc21 TINYINT NULL COMMENT 'Hace berrinches, tiene conducta explosiva o difícil de predecir',

  -- ── PARTICIPACIÓN EN GRUPO (reactivos 22..29) ──
  pg1  TINYINT NULL COMMENT 'Se aísla de otros niños',
  pg2  TINYINT NULL COMMENT 'Parece que el grupo no lo acepta',
  pg3  TINYINT NULL COMMENT 'Parece que lo dominan con facilidad',
  pg4  TINYINT NULL COMMENT 'No tiene sentido de juego limpio',
  pg5  TINYINT NULL COMMENT 'Parece carecer de liderazgo',
  pg6  TINYINT NULL COMMENT 'No se lleva bien con personas del sexo opuesto',
  pg7  TINYINT NULL COMMENT 'No se lleva bien con personas del mismo sexo',
  pg8  TINYINT NULL COMMENT 'Fastidia a otros niños o interfiere con sus actividades',

  -- ── ACTITUD HACIA LA AUTORIDAD (reactivos 30..39) ──
  aa1  TINYINT NULL COMMENT 'Sumiso',
  aa2  TINYINT NULL COMMENT 'Desafiante',
  aa3  TINYINT NULL COMMENT 'Descarado',
  aa4  TINYINT NULL COMMENT 'Tímido',
  aa5  TINYINT NULL COMMENT 'Temeroso',
  aa6  TINYINT NULL COMMENT 'Demanda de manera excesiva la atención del maestro',
  aa7  TINYINT NULL COMMENT 'Es terco',
  aa8  TINYINT NULL COMMENT 'Demasiado ansioso de complacer',
  aa9  TINYINT NULL COMMENT 'Poco cooperador',
  aa10 TINYINT NULL COMMENT 'Tiene problemas de asistencia',

  -- ── COMENTARIOS ──
  comentarios            TEXT NULL,

  -- ── Metadatos ──
  user_id_crea           INT NULL                    COMMENT 'Quién generó la solicitud',
  fecha_crea             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_completado       DATETIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_ficha_psicologia_token (token),
  KEY idx_ficha_psicologia_paciente (paciente_id),
  CONSTRAINT fk_ficha_psicologia_paciente
    FOREIGN KEY (paciente_id) REFERENCES paciente (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
