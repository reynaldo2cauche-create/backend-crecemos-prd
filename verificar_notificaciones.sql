-- Verificar si hay notificaciones en la base de datos

-- 1. Ver todas las notificaciones
SELECT
  n.id,
  n.tipo_notificacion,
  n.titulo,
  n.mensaje,
  n.fecha_creacion,
  e.tipo_evento
FROM notificaciones n
INNER JOIN eventos_sistema e ON e.id = n.evento_id
ORDER BY n.fecha_creacion DESC
LIMIT 10;

-- 2. Ver destinos de notificaciones (roles)
SELECT
  nd.notificacion_id,
  nd.rol_id,
  n.titulo
FROM notificaciones_destino nd
INNER JOIN notificaciones n ON n.id = nd.notificacion_id
ORDER BY nd.notificacion_id DESC
LIMIT 10;

-- 3. Ver notificaciones recientes (últimas 24h)
SELECT
  n.id,
  n.tipo_notificacion,
  n.titulo,
  n.fecha_creacion,
  e.tipo_evento
FROM notificaciones n
INNER JOIN eventos_sistema e ON e.id = n.evento_id
WHERE n.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY n.fecha_creacion DESC;

-- 4. Ver notificaciones por rol (ejemplo rol 1 = ADMIN)
SELECT
  n.id,
  n.tipo_notificacion,
  n.titulo,
  n.mensaje,
  n.fecha_creacion
FROM notificaciones n
INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
WHERE nd.rol_id = 1
ORDER BY n.fecha_creacion DESC
LIMIT 10;

-- 5. Ver tabla notificaciones_leidas
SELECT * FROM notificaciones_leidas
ORDER BY fecha_lectura DESC
LIMIT 10;

-- 6. Contar notificaciones por rol
SELECT
  nd.rol_id,
  COUNT(*) as total
FROM notificaciones_destino nd
GROUP BY nd.rol_id;
