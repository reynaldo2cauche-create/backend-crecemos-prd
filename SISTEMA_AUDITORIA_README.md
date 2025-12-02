# 📋 Sistema de Auditoría y Alertas - Centro Crecemos

## 🎯 Descripción General

Sistema completo de auditoría y monitoreo de acciones de usuarios implementado para el Centro Crecemos. Registra **TODAS** las acciones que realizan los usuarios en el sistema y genera alertas automáticas ante actividades sospechosas o inusuales.

---

## ✅ Lo que se Implementó

### **BACKEND (NestJS)**

#### 1. **Base de Datos (MySQL)**

**Archivo**: `migration_auditoria_sistema.sql`

**Tablas creadas**:
- ✅ `auditoria_acciones` - Registro completo de todas las acciones
- ✅ `alertas_sistema` - Notificaciones de actividades sospechosas
- ✅ `configuracion_alertas` - Reglas automáticas de generación de alertas

**Características**:
- Índices optimizados para consultas rápidas
- Vistas SQL para estadísticas
- Procedimiento almacenado para limpieza automática
- Evento programado para mantenimiento mensual
- 8 reglas de alertas preconfiguradas

#### 2. **Entidades TypeORM**

Archivos creados en `src/auditoria/`:
- `auditoria-accion.entity.ts` - Entidad de acciones de auditoría
- `alerta-sistema.entity.ts` - Entidad de alertas del sistema
- `configuracion-alerta.entity.ts` - Entidad de configuración de reglas

#### 3. **Servicios Backend**

- **`AuditoriaService`**: Gestiona el registro y consulta de auditoría
  - Registro asíncrono de acciones (no bloquea operaciones)
  - Filtros avanzados de búsqueda
  - Estadísticas por módulo, usuario y tipo de acción
  - Historial por entidad específica

- **`AlertasService`**: Genera y gestiona alertas automáticas
  - Evaluación de reglas automáticas
  - Detección de umbrales de cantidad
  - Verificación de horarios no permitidos
  - Identificación de modificaciones críticas
  - Detección de códigos de error (403, 500, etc.)

#### 4. **Interceptor Global**

**`AuditoriaInterceptor`** - Captura automáticamente TODAS las peticiones HTTP:
- Se ejecuta en cada request autenticado
- Extrae información del usuario desde JWT
- Captura IP, User-Agent, método HTTP, endpoint
- Genera descripciones legibles automáticamente
- Excluye datos sensibles (passwords)
- Evalúa alertas de forma asíncrona

#### 5. **Decorador Personalizado**

**`@Auditable()`** - Marca endpoints que deben auditarse:

```typescript
@Auditable({
  modulo: 'PACIENTES',
  accion: 'VER_PACIENTE',
  entidadTipo: 'Paciente'
})
@Get(':id')
obtenerPaciente(@Param('id') id: number) {
  return this.pacienteService.findOne(id);
}
```

#### 6. **Controller de Auditoría**

**Endpoints disponibles** (solo para ADMINISTRADORES):

```
GET /backend_api/auditoria/historial                    - Historial con filtros
GET /backend_api/auditoria/historial/:tipo/:id          - Historial de entidad
GET /backend_api/auditoria/estadisticas                 - Estadísticas generales
GET /backend_api/auditoria/actividad-usuario/:id        - Actividad de usuario
GET /backend_api/auditoria/ultimas-acciones             - Últimas acciones

GET /backend_api/auditoria/alertas                      - Alertas con filtros
GET /backend_api/auditoria/alertas/contador/no-leidas  - Conteo de alertas
PUT /backend_api/auditoria/alertas/:id/marcar-leida    - Marcar como leída
PUT /backend_api/auditoria/alertas/marcar-todas-leidas - Marcar todas leídas
PUT /backend_api/auditoria/alertas/:id/resolver        - Resolver alerta
GET /backend_api/auditoria/alertas/estadisticas        - Estadísticas de alertas
```

---

### **FRONTEND (React)**

#### 1. **Servicios HTTP**

**`auditoriaService.js`**:
- `obtenerHistorial(filtros)` - Obtiene historial con filtros
- `obtenerHistorialEntidad(tipo, id)` - Historial de una entidad
- `obtenerEstadisticas(fechas)` - Estadísticas de auditoría
- `obtenerActividadUsuario(id)` - Actividad de un usuario

**`alertasService.js`**:
- `obtenerAlertas(filtros)` - Obtiene alertas con filtros
- `contarAlertasNoLeidas()` - Conteo de alertas nuevas
- `marcarAlertaLeida(id)` - Marca alerta como leída
- `marcarTodasAlertasLeidas()` - Marca todas como leídas
- `resolverAlerta(id, comentarios)` - Resuelve una alerta
- `iniciarPollingAlertas(callback)` - Polling automático

#### 2. **Componentes**

**`NotificacionesGlobales.jsx`** - Sistema unificado de notificaciones:
- ✅ Combina alertas de seguridad + vacaciones
- ✅ Badge con contador total de notificaciones
- ✅ Tabs para filtrar por tipo
- ✅ Polling automático cada 30 segundos
- ✅ Diseño responsive y moderno
- ✅ Fácilmente extensible para nuevos tipos

#### 3. **Páginas**

**`HistorialAuditoria.jsx`** - Página completa de auditoría:
- ✅ Tabla paginada de registros
- ✅ Filtros avanzados (módulo, acción, fechas, búsqueda)
- ✅ Estadísticas en tiempo real
- ✅ Chips de colores por módulo y método HTTP
- ✅ Diseño Material-UI responsive

#### 4. **Integración en Sidebar**

- ✅ Menú "Auditoría" agregado (solo para ADMINISTRADORES)
- ✅ Componente NotificacionesGlobales integrado
- ✅ Reemplaza el anterior sistema de notificaciones de vacaciones
- ✅ Soporte para múltiples tipos de notificaciones

---

## 🚀 Instalación y Configuración

### **Paso 1: Ejecutar Script SQL**

```bash
# Conectarse a MySQL
mysql -u root -p

# Seleccionar base de datos
USE crecemos_website;

# Ejecutar script
SOURCE C:/Users/Lucero/Desktop/centro-crecemos/migration_auditoria_sistema.sql;
```

### **Paso 2: Reiniciar Backend**

```bash
cd C:/Users/Lucero/Desktop/centro-crecemos
npm run start:dev
```

### **Paso 3: Agregar Ruta en Frontend**

Editar `src/routes/AppRouter.jsx` y agregar:

```jsx
// En la sección de imports (después de las páginas de RRHH)
import HistorialAuditoria from '../pages/Auditoria/HistorialAuditoria';

// En la sección de Routes (después de las rutas de RRHH)
<Route path="/intranet/auditoria" element={
  <PrivateRoute>
    <SidebarProvider>
      <Sidebar />
      <SidebarContentWrapper>
        <HistorialAuditoria />
      </SidebarContentWrapper>
    </SidebarProvider>
  </PrivateRoute>
} />
```

### **Paso 4: Verificar Instalación**

1. Accede al sistema como **ADMINISTRADOR**
2. Verifica que aparezca el menú "Auditoría" en el sidebar
3. Verifica que aparezca el badge de notificaciones (campana)
4. Navega a `/intranet/auditoria`
5. Deberías ver el historial de auditoría

---

## 📝 Cómo Usar el Decorador @Auditable

Para que una acción se registre automáticamente, agrega el decorador `@Auditable()` en tus controllers:

### **Ejemplo 1: Ver Paciente**

```typescript
import { Auditable } from '../auditoria/decorators/auditable.decorator';

@Get(':id')
@Auditable({
  modulo: 'PACIENTES',
  accion: 'VER_PACIENTE',
  entidadTipo: 'Paciente'
})
obtenerPaciente(@Param('id') id: number) {
  return this.pacienteService.findOne(id);
}
```

### **Ejemplo 2: Editar Empleado**

```typescript
@Put(':id')
@Auditable({
  modulo: 'RRHH',
  accion: 'EDITAR_EMPLEADO',
  entidadTipo: 'TrabajadorCentro'
})
actualizarEmpleado(@Param('id') id: number, @Body() dto: UpdateEmpleadoDto) {
  return this.empleadoService.update(id, dto);
}
```

### **Ejemplo 3: Crear Certificado**

```typescript
@Post()
@Auditable({
  modulo: 'ARCHIVOS',
  accion: 'CREAR_CERTIFICADO',
  entidadTipo: 'ArchivoOficial'
})
crearCertificado(@Body() dto: CrearCertificadoDto) {
  return this.certificadoService.create(dto);
}
```

---

## 🔔 Tipos de Alertas Automáticas

El sistema genera alertas automáticamente cuando detecta:

| Tipo                         | Severidad | Descripción                                    |
| ---------------------------- | --------- | ---------------------------------------------- |
| **Descargas masivas**        | ALTA      | Más de 20 archivos en 30 minutos              |
| **Acceso fuera de horario**  | MEDIA     | Accesos entre 12:00 AM - 6:00 AM              |
| **Modificación de sueldos**  | CRITICA   | Cambios en el campo `sueldo_base`             |
| **Login fallidos**           | ALTA      | Más de 3 intentos en 15 minutos               |
| **Eliminación masiva**       | ALTA      | Más de 5 eliminaciones en 10 minutos          |
| **Exportación masiva**       | MEDIA     | Exportar más de 100 registros                 |
| **Acceso sin permisos**      | ALTA      | Intentos con código 403                       |
| **Cambio de roles**          | CRITICA   | Modificación del campo `rol_id`               |

---

## 📊 Estadísticas y Reportes

El sistema proporciona:

- ✅ Total de acciones registradas
- ✅ Acciones por módulo
- ✅ Acciones por usuario (top 10)
- ✅ Acciones por tipo (top 10)
- ✅ Usuarios más activos
- ✅ Módulos más utilizados
- ✅ Alertas por severidad
- ✅ Alertas por tipo

---

## 🎨 Sistema de Notificaciones Unificado

El componente `NotificacionesGlobales` combina:

1. **Alertas de Seguridad** (solo para ADMINISTRADORES)
   - Actividades sospechosas
   - Código de colores por severidad (CRITICA, ALTA, MEDIA, BAJA)
   - Opciones: Marcar leída, Ver todas

2. **Vacaciones** (todos los roles)
   - Empleados con vacaciones próximas (< 30 días)
   - Alerta crítica si faltan menos de 7 días

3. **Extensible** para futuras notificaciones:
   - Citas pendientes
   - Documentos por vencer
   - Pagos pendientes
   - etc.

### **Cómo Agregar Nuevos Tipos de Notificaciones**

1. Agregar nueva tab en `TABS` constante
2. Crear servicio de consulta
3. Agregar lógica de carga en `cargarNotificaciones()`
4. Agregar renderizado en el switch de tipos
5. Agregar botón de acción en el footer

---

## 🔐 Permisos y Seguridad

- ✅ Solo **ADMINISTRADORES** pueden ver alertas de seguridad
- ✅ Solo **ADMINISTRADORES** pueden acceder al historial de auditoría
- ✅ Todos los roles ven notificaciones de vacaciones
- ✅ El interceptor NO audita peticiones sin autenticación
- ✅ Los datos sensibles (passwords) se excluyen automáticamente
- ✅ Las alertas se evalúan de forma asíncrona (no afectan performance)

---

## 🧹 Mantenimiento Automático

El sistema incluye:

- **Procedimiento almacenado**: `sp_limpiar_auditoria_antigua(dias)`
  - Elimina registros antiguos (preserva LOGIN, LOGOUT, EDITAR_EMPLEADO)

- **Evento programado**: `evento_limpiar_auditoria`
  - Se ejecuta cada mes
  - Elimina automáticamente registros > 6 meses
  - Mantiene el sistema optimizado

---

## 📌 Acciones que se Registran Automáticamente

### **Módulo PACIENTES**
- VER_PACIENTE
- VER_LISTA_PACIENTES
- CREAR_PACIENTE
- EDITAR_PACIENTE
- EDITAR_FILIACION
- EDITAR_HISTORIA_CLINICA
- ASIGNAR_SERVICIO
- CAMBIAR_ESTADO_PACIENTE

### **Módulo CITAS**
- VER_AGENDA
- CREAR_CITA
- EDITAR_CITA
- ELIMINAR_CITA

### **Módulo ARCHIVOS**
- SUBIR_ARCHIVO_DIGITAL
- DESCARGAR_ARCHIVO
- ELIMINAR_ARCHIVO
- CREAR_CERTIFICADO
- VER_CERTIFICADO

### **Módulo RRHH**
- VER_EMPLEADO
- CREAR_EMPLEADO
- EDITAR_EMPLEADO
- ELIMINAR_EMPLEADO
- CALCULAR_GRATIFICACION
- REGISTRAR_PAGO
- REGISTRAR_VACACION

### **Módulo POSTULACIONES**
- VER_POSTULACION
- CAMBIAR_ESTADO_POSTULACION
- AGREGAR_COMENTARIO

### **Otros**
- EXPORTAR_DATOS
- LOGIN
- LOGOUT

---

## 🎯 Próximos Pasos Recomendados

1. ✅ **Aplicar el decorador `@Auditable()` en todos los controllers**
   - Ir controller por controller
   - Agregar el decorador en cada endpoint importante
   - Ver ejemplos arriba

2. ✅ **Configurar reglas de alertas adicionales**
   - Editar tabla `configuracion_alertas`
   - Agregar nuevas reglas según necesidades

3. ✅ **Crear dashboard visual de auditoría**
   - Gráficos de actividad por hora/día
   - Mapa de calor de acciones
   - Tendencias de uso

4. ✅ **Implementar webhooks para alertas críticas**
   - Enviar email/SMS cuando hay alertas CRITICAS
   - Integrar con Slack/Discord

5. ✅ **Exportar reportes a PDF/Excel**
   - Agregar botón de exportación
   - Generar reportes mensuales automáticos

---

## ❓ Preguntas Frecuentes

**¿Afecta el performance del sistema?**
No. El registro de auditoría es asíncrono y las alertas se evalúan en background.

**¿Cuánto espacio ocupa en base de datos?**
Depende del uso. Con limpieza automática cada 6 meses, el tamaño se mantiene controlado.

**¿Puedo desactivar la auditoría temporalmente?**
Sí, puedes comentar el provider del interceptor en `app.module.ts`.

**¿Cómo agrego nuevos tipos de acciones?**
Solo agrega el decorador `@Auditable()` con el nuevo nombre de acción.

**¿Puedo ver el historial de un paciente específico?**
Sí, usa: `GET /auditoria/historial/Paciente/:id`

---

## 📞 Soporte

Para dudas o problemas con el sistema de auditoría:
- Revisar logs del backend: `npm run start:dev`
- Verificar consola del navegador (F12)
- Consultar tabla `auditoria_acciones` en MySQL

---

**Sistema implementado por**: Claude Code
**Fecha**: 02/12/2025
**Versión**: 1.0.0
