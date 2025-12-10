-- ===============================================
-- CONFIGURACIÓN DE ALERTAS PARA ACCIONES SOSPECHOSAS
-- ===============================================
-- Este script configura alertas SOLO para actividades sospechosas
-- NO genera alertas para acciones normales del día a día

-- Limpiar configuraciones anteriores (opcional)
-- TRUNCATE TABLE configuracion_alertas;

-- ===============================================
-- 1. ACCESO MASIVO SOSPECHOSO
-- ===============================================
-- Alerta si un usuario hace más de 15 acciones en 5 minutos
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '🚨 Actividad Masiva Sospechosa',
  'ACTIVIDAD_MASIVA',
  'Usuario realizando un número anormalmente alto de acciones en poco tiempo',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 15,
    'ventana_minutos', 5
  ),
  'ALTA',
  true
);

-- ===============================================
-- 2. ACCESO FUERA DE HORARIO LABORAL
-- ===============================================
-- Alerta si alguien accede entre 11 PM y 7 AM
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '🌙 Acceso Fuera de Horario',
  'ACCESO_FUERA_HORARIO',
  'Usuario accediendo al sistema fuera del horario laboral permitido',
  'HORARIO',
  JSON_OBJECT(
    'hora_inicio', '07:00',
    'hora_fin', '23:00'
  ),
  'MEDIA',
  true
);

-- ===============================================
-- 3. MÚLTIPLES ELIMINACIONES
-- ===============================================
-- Alerta si se eliminan más de 3 registros en 10 minutos
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '🗑️ Eliminaciones Masivas',
  'ELIMINACION_MASIVA',
  'Usuario eliminando múltiples registros en poco tiempo',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 3,
    'ventana_minutos', 10,
    'accion', 'ELIMINAR'
  ),
  'CRITICA',
  true
);

-- ===============================================
-- 4. MÚLTIPLES EDICIONES CONSECUTIVAS
-- ===============================================
-- Alerta si se editan más de 10 registros en 5 minutos
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '✏️ Ediciones Masivas Sospechosas',
  'EDICION_MASIVA',
  'Usuario editando un número inusual de registros',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 10,
    'ventana_minutos', 5,
    'accion', 'EDITAR'
  ),
  'ALTA',
  true
);

-- ===============================================
-- 5. EXPORTACIÓN MASIVA DE DATOS
-- ===============================================
-- Alerta si se exportan datos más de 3 veces en 30 minutos
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '📥 Exportación Masiva de Datos',
  'EXPORTACION_MASIVA',
  'Usuario exportando datos múltiples veces (posible filtración)',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 3,
    'ventana_minutos', 30,
    'accion', 'EXPORTAR_DATOS'
  ),
  'CRITICA',
  true
);

-- ===============================================
-- 6. MODIFICACIÓN DE DATOS CRÍTICOS DE PACIENTES
-- ===============================================
-- Alerta si se modifica el estado de un paciente
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
  'Se modificó el estado de un paciente (activo/inactivo/oculto)',
  'CAMPO_CRITICO',
  JSON_OBJECT(
    'modulo', 'PACIENTES',
    'accion', 'CAMBIAR_ESTADO_PACIENTE'
  ),
  'MEDIA',
  true
);

-- ===============================================
-- 7. ELIMINACIÓN DE ARCHIVOS DIGITALES
-- ===============================================
-- Alerta cada vez que se elimina un archivo digital de un paciente
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '🗂️ Eliminación de Archivo Digital',
  'ELIMINACION_ARCHIVO',
  'Se eliminó un archivo digital de la historia clínica de un paciente',
  'CAMPO_CRITICO',
  JSON_OBJECT(
    'modulo', 'HISTORIA_CLINICA',
    'accion', 'ELIMINAR_ARCHIVO'
  ),
  'ALTA',
  true
);

-- ===============================================
-- 8. MÚLTIPLES INTENTOS DE ASIGNACIÓN DE SERVICIOS
-- ===============================================
-- Alerta si se asignan más de 5 servicios en 10 minutos
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '💼 Asignaciones Masivas de Servicios',
  'ASIGNACION_MASIVA',
  'Usuario asignando múltiples servicios en poco tiempo',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 5,
    'ventana_minutos', 10,
    'accion', 'ASIGNAR_SERVICIO'
  ),
  'MEDIA',
  true
);

-- ===============================================
-- 9. ACCESO REPETITIVO A HISTORIAS CLÍNICAS
-- ===============================================
-- Alerta si se consultan más de 20 historias en 10 minutos
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '👁️ Consulta Masiva de Historias Clínicas',
  'CONSULTA_MASIVA_HC',
  'Usuario consultando un número inusual de historias clínicas (posible espionaje)',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 20,
    'ventana_minutos', 10,
    'accion', 'VER_PACIENTE'
  ),
  'ALTA',
  true
);

-- ===============================================
-- 10. DESCARGA MASIVA DE ARCHIVOS
-- ===============================================
-- Alerta si se descargan más de 8 archivos en 15 minutos
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '📥 Descarga Masiva de Archivos',
  'DESCARGA_MASIVA',
  'Usuario descargando múltiples archivos (posible filtración de datos)',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 8,
    'ventana_minutos', 15,
    'accion', 'DESCARGAR_ARCHIVO'
  ),
  'CRITICA',
  true
);

-- ===============================================
-- VERIFICAR CONFIGURACIONES CREADAS
-- ===============================================
SELECT
  id,
  nombre,
  tipo_alerta,
  severidad,
  activa,
  fecha_creacion
FROM configuracion_alertas
ORDER BY severidad DESC, fecha_creacion DESC;

-- ===============================================
-- NOTAS IMPORTANTES:
-- ===============================================
-- ✅ Las alertas están configuradas para detectar SOLO acciones sospechosas
-- ✅ NO se generarán alertas para acciones normales del día a día
-- ✅ Puedes ajustar los umbrales según tus necesidades:
--    - Aumenta 'limite' para ser menos estricto
--    - Disminuye 'ventana_minutos' para detectar actividad más concentrada
-- ✅ Puedes desactivar cualquier alerta poniendo activa = false

-- Para desactivar una alerta específica:
-- UPDATE configuracion_alertas SET activa = false WHERE id = 1;

-- Para ver alertas generadas:
-- SELECT * FROM alertas_sistema ORDER BY fecha_creacion DESC LIMIT 20;
