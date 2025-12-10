-- ===============================================
-- CONFIGURACIÓN ULTRA SIMPLE - SE DISPARA CON TODO
-- ===============================================
-- Esta alerta se va a disparar con CUALQUIER cosa que hagas
-- Solo para probar que el sistema funciona

-- Limpiar todo
DELETE FROM configuracion_alertas;
DELETE FROM alertas_sistema;

-- Configuración que se dispara si haces MÁS DE 2 acciones en 30 minutos
-- (O sea, casi cualquier cosa)
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '🧪 PRUEBA - Cualquier actividad',
  'PRUEBA_GENERAL',
  'Se dispara con casi cualquier acción - SOLO PARA PRUEBAS',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 2,
    'ventana_minutos', 30
  ),
  'ALTA',
  true
);

-- Verificar
SELECT * FROM configuracion_alertas;
