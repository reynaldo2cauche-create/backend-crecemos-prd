-- ===============================================
-- CONFIGURACIÓN COMPLETA DE ALERTAS
-- ===============================================
-- Ejecuta este SQL en tu base de datos MySQL

-- Limpiar configuraciones anteriores (si las hay)
TRUNCATE TABLE configuracion_alertas;

-- ===============================================
-- 1. ACCESO FUERA DE HORARIO LABORAL
-- ===============================================
-- Horario laboral: L-V 11am-8pm, S 8am-2pm, D cerrado
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
  JSON_OBJECT('hora_inicio', '00:00', 'hora_fin', '23:59'),
  'MEDIA',
  true
);

-- ===============================================
-- 2. ELIMINACIÓN DE CITAS (AGENDA)
-- ===============================================
-- Genera alerta cada vez que se elimina una cita
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '🗓️ Eliminación de Cita',
  'ELIMINACION_CITA',
  'Se eliminó una cita de la agenda',
  'CAMPO_CRITICO',
  JSON_OBJECT(
    'modulo', 'CITAS',
    'accion', 'ELIMINAR_CITA'
  ),
  'ALTA',
  true
);

-- ===============================================
-- 3. ELIMINACIÓN DE ARCHIVOS DIGITALES
-- ===============================================
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
  'Se eliminó un archivo digital de la historia clínica',
  'CAMPO_CRITICO',
  JSON_OBJECT(
    'modulo', 'ARCHIVOS_DIGITALES',
    'accion', 'ELIMINAR_ARCHIVO'
  ),
  'ALTA',
  true
);

-- ===============================================
-- 4. MÚLTIPLES ELIMINACIONES
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
-- 5. CAMBIO DE ESTADO DE PACIENTE
-- ===============================================
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
  'Se modificó el estado de un paciente (activo/inactivo)',
  'CAMPO_CRITICO',
  JSON_OBJECT(
    'modulo', 'PACIENTES',
    'accion', 'CAMBIAR_ESTADO_PACIENTE'
  ),
  'MEDIA',
  true
);

-- ===============================================
-- 6. ACTIVIDAD MASIVA SOSPECHOSA
-- ===============================================
-- Alerta si un usuario hace más de 20 acciones en 5 minutos
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
  'Usuario realizando un número anormalmente alto de acciones',
  'UMBRAL_CANTIDAD',
  JSON_OBJECT(
    'limite', 20,
    'ventana_minutos', 5
  ),
  'ALTA',
  true
);

-- ===============================================
-- 7. CONSULTA MASIVA DE HISTORIAS CLÍNICAS
-- ===============================================
INSERT INTO configuracion_alertas (
  nombre,
  tipo_alerta,
  descripcion,
  condicion_tipo,
  condicion_valor,
  severidad,
  activa
) VALUES (
  '👁️ Consulta Masiva de Historias',
  'CONSULTA_MASIVA_HC',
  'Usuario consultando muchas historias clínicas (posible espionaje)',
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
-- 8. DESCARGA MASIVA DE ARCHIVOS
-- ===============================================
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
  'Usuario descargando múltiples archivos (posible filtración)',
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
  condicion_valor,
  fecha_creacion
FROM configuracion_alertas
ORDER BY severidad DESC, fecha_creacion DESC;
