-- ===============================================
-- SCRIPT DE PRUEBA RÁPIDA - SISTEMA DE ALERTAS
-- ===============================================
-- Este script crea:
-- 1. UNA configuración simple de alerta
-- 2. UNA alerta de prueba para que veas el sistema funcionando

-- ===============================================
-- 1️⃣ LIMPIAR Y CREAR CONFIGURACIÓN DE PRUEBA
-- ===============================================

-- Limpiar configuraciones anteriores
DELETE FROM configuracion_alertas;

-- Insertar UNA configuración simple: Cambio de estado de paciente
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '⚠️ Cambio de Estado de Paciente',
  'CAMBIO_ESTADO_PACIENTE',
  'Se modificó el estado de un paciente',
  'CAMPO_CRITICO',
  '{"modulo":"PACIENTES","accion":"CAMBIAR_ESTADO_PACIENTE"}',
  'MEDIA',
  1
);

-- Verificar que se creó
SELECT
  id,
  nombre,
  tipo_alerta,
  severidad,
  activa
FROM configuracion_alertas;

-- ===============================================
-- 2️⃣ CREAR ALERTA DE PRUEBA MANUALMENTE
-- ===============================================

-- Obtener tu ID de usuario (asumiendo que eres el primer admin)
SET @tu_user_id = (SELECT id FROM trabajadores WHERE rol_id = 1 LIMIT 1);
SET @tu_nombre = (SELECT CONCAT(nombres, ' ', apellidos) FROM trabajadores WHERE id = @tu_user_id);

-- Crear una alerta de prueba
INSERT INTO alertas_sistema (
  tipo,
  severidad,
  trabajador_id,
  trabajador_nombre,
  titulo,
  mensaje,
  contexto,
  auditoria_id,
  leida,
  resuelta,
  fecha_creacion
) VALUES (
  'PRUEBA_SISTEMA',
  'CRITICA',
  @tu_user_id,
  @tu_nombre,
  '🧪 Alerta de Prueba del Sistema',
  CONCAT('¡Hola ', @tu_nombre, '! Esta es una alerta de prueba para verificar que el sistema de notificaciones funciona correctamente. Si puedes ver esto, significa que todo está bien configurado.'),
  '{"modulo":"SISTEMA","accion":"PRUEBA","descripcion":"Alerta de prueba generada manualmente"}',
  NULL,
  0,
  0,
  NOW()
);

-- Crear una segunda alerta simulando actividad sospechosa
INSERT INTO alertas_sistema (
  tipo,
  severidad,
  trabajador_id,
  trabajador_nombre,
  titulo,
  mensaje,
  contexto,
  auditoria_id,
  leida,
  resuelta,
  fecha_creacion
) VALUES (
  'ACTIVIDAD_MASIVA',
  'ALTA',
  @tu_user_id,
  @tu_nombre,
  '🚨 Actividad Sospechosa Detectada',
  CONCAT(@tu_nombre, ' realizó más de 15 acciones en 5 minutos. Esta es una alerta de prueba para demostrar cómo se verían las alertas reales.'),
  '{"modulo":"SISTEMA","accion":"VER_PACIENTE","descripcion":"Consulta masiva de pacientes - SIMULACIÓN"}',
  NULL,
  0,
  0,
  NOW()
);

-- ===============================================
-- 3️⃣ VERIFICAR QUE SE CREARON LAS ALERTAS
-- ===============================================

SELECT
  id,
  tipo,
  severidad,
  titulo,
  LEFT(mensaje, 50) as mensaje_preview,
  trabajador_nombre,
  leida,
  fecha_creacion
FROM alertas_sistema
ORDER BY fecha_creacion DESC
LIMIT 5;

-- ===============================================
-- 4️⃣ VERIFICAR CONTEO DE ALERTAS NO LEÍDAS
-- ===============================================

SELECT
  COUNT(*) as total_alertas_no_leidas
FROM alertas_sistema
WHERE leida = 0;

-- ===============================================
-- ✅ RESULTADO ESPERADO:
-- ===============================================
-- Deberías ver:
-- - 1 configuración de alerta creada
-- - 2 alertas de prueba creadas
-- - 2 alertas no leídas
--
-- Ahora refresca tu frontend y deberías ver el badge 🔔 con el número "2"
-- ===============================================

-- ===============================================
-- 🧹 PARA LIMPIAR LAS ALERTAS DE PRUEBA:
-- ===============================================
-- DELETE FROM alertas_sistema WHERE tipo = 'PRUEBA_SISTEMA' OR tipo = 'ACTIVIDAD_MASIVA';
