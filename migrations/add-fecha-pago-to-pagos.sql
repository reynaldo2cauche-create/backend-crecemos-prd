-- Agrega fecha_pago a las tablas de pagos de ventas
-- Si no se envía, queda NULL (compatible con registros existentes)

ALTER TABLE venta_servicio_pago
  ADD COLUMN fecha_pago DATETIME NULL AFTER referencia;

ALTER TABLE venta_producto_pago
  ADD COLUMN fecha_pago DATETIME NULL AFTER referencia;
