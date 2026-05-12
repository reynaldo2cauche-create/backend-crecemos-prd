-- Validación por método de pago en ventas de servicios
ALTER TABLE venta_servicio_pago
  ADD COLUMN pago_validado     TINYINT(1)   NOT NULL DEFAULT 0    COMMENT '0=No validado, 1=Validado',
  ADD COLUMN pago_validado_por INT UNSIGNED NULL                   COMMENT 'FK trabajador_centro que validó',
  ADD COLUMN pago_validado_at  TIMESTAMP    NULL                   COMMENT 'Fecha y hora de validación';

-- Validación por método de pago en ventas de productos
ALTER TABLE venta_producto_pago
  ADD COLUMN pago_validado     TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN pago_validado_por INT UNSIGNED NULL,
  ADD COLUMN pago_validado_at  TIMESTAMP    NULL;
