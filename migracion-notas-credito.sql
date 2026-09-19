-- =====================================================
-- MIGRACIÓN: Devoluciones / Notas de Crédito de ventas de servicio
--
-- Qué hace:
--   1. Crea el estado de cita "Anulada" (id 9) para citas anuladas por devolución.
--   2. Crea la tabla nota_credito, que relaciona una venta_servicio con su
--      devolución (monto reembolsado, motivo, cuántas citas/sesiones se anularon).
--
-- Efecto de una devolución (lo hace el backend, no este script):
--   • Las citas futuras NO realizadas de la venta se marcan estado_id = 9 (Anulada)
--     y flg_activo = 0  → el horario queda LIBRE en la agenda para otro paciente.
--   • El saldo de sesiones SIN asignar se consume (sesiones_usadas = sesiones_totales)
--     → ya no se pueden agendar.
-- =====================================================

-- ──────────────────────────────────────────────────────────────────
-- PASO 1 — Estado de cita "Anulada"
-- Estados existentes: 1=Programada, 5=Cancelada, 6=Sesión Dictada,
--                     7=Asistió, 8=No asistió.
-- ──────────────────────────────────────────────────────────────────
INSERT INTO estado_cita (id, nombre, descripcion, activo)
SELECT 9, 'Anulada', 'Cita anulada por nota de crédito / devolución de venta', 1
WHERE NOT EXISTS (SELECT 1 FROM estado_cita WHERE nombre = 'Anulada');

-- ──────────────────────────────────────────────────────────────────
-- PASO 1.b — Tipo de comprobante "Nota de Crédito" (id 4)
-- Existentes: 1=Nota de Venta, 2=Boleta, 3=Factura.
-- ──────────────────────────────────────────────────────────────────
INSERT INTO tipo_comprobante (id, nombre)
SELECT 4, 'Nota de Crédito'
WHERE NOT EXISTS (SELECT 1 FROM tipo_comprobante WHERE nombre = 'Nota de Crédito');

-- ──────────────────────────────────────────────────────────────────
-- PASO 2 — Tabla nota_credito
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nota_credito (
  id                 INT NOT NULL AUTO_INCREMENT,
  codigo             VARCHAR(20)  NULL      COMMENT 'Código de la nota de crédito (NC-0001)',
  venta_servicio_id  INT NOT NULL          COMMENT 'Venta de servicio a la que aplica la devolución',
  fecha              DATE NOT NULL         COMMENT 'Fecha de la devolución',
  motivo             TEXT NULL             COMMENT 'Motivo de la devolución',
  monto_devuelto     DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Monto reembolsado al cliente',
  modalidad_pago_id  INT NULL              COMMENT 'Método por el que se devuelve el dinero',
  citas_anuladas     INT NOT NULL DEFAULT 0 COMMENT 'Cantidad de citas futuras anuladas (liberadas de la agenda)',
  sesiones_anuladas  INT NOT NULL DEFAULT 0 COMMENT 'Cantidad de sesiones sin asignar que se anularon',
  user_crea_id       INT NULL              COMMENT 'Quién registró la devolución',
  validado           TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Devolución validada (aprobada)',
  validado_por       INT NULL              COMMENT 'Quién validó la devolución',
  validado_at        TIMESTAMP NULL        COMMENT 'Cuándo se validó',
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nota_credito_codigo (codigo),
  KEY idx_nota_credito_venta (venta_servicio_id),
  CONSTRAINT fk_nota_credito_venta
    FOREIGN KEY (venta_servicio_id) REFERENCES venta_servicio (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
