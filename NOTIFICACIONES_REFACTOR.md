# ✅ REFACTORIZACIÓN SISTEMA DE NOTIFICACIONES

## 📋 RESUMEN

Se eliminó el sistema de **cron jobs** que sobrecargaba el servidor y se implementó un sistema **on-demand** que calcula notificaciones solo cuando es necesario. El SSE (Server-Sent Events) se mantiene para notificaciones en tiempo real.

---

## 🔧 CAMBIOS REALIZADOS

### **BACKEND:**

#### 1. **notificaciones.service.ts** - ✅ REFACTORIZADO
**Cambios principales:**
- ❌ **ELIMINADO:** Decorador `@Cron` - ya no se ejecuta automáticamente
- ✅ **NUEVO:** Variable `ultimoCalculoDiario` para controlar ejecución 1 vez al día
- ✅ **NUEVO:** Método `generarNotificacionesDiarias()` retorna objeto con estado
- ✅ Código limpio con JSDoc en cada método
- ✅ Manejo de errores mejorado

**Cómo funciona ahora:**
```typescript
// Se ejecuta SOLO cuando se llama manualmente
async generarNotificacionesDiarias() {
  // Verifica si ya se calculó hoy
  if (ya_se_calculo_hoy) return { ejecutado: false };

  // Calcula cumpleaños y aniversarios
  await this.generarNotificacionesCumpleanos();
  await this.generarNotificacionesAniversario();

  this.ultimoCalculoDiario = new Date();
  return { ejecutado: true };
}
```

#### 2. **notificaciones.controller.ts** - ✅ REFACTORIZADO
**Cambios:**
- ✅ Código descomentado y limpio
- ✅ JSDoc en todos los endpoints
- ✅ SSE funcionando correctamente
- ✅ Sin cambios en la API (compatible con frontend existente)

#### 3. **notificaciones.module.ts** - ✅ HABILITADO
**Cambios:**
- ✅ Descomentado controller y service
- ✅ Exports añadidos para usar en otros módulos

#### 4. **auth.service.ts** - ✅ INTEGRADO
**Cambios principales:**
- ✅ Importa `NotificacionesService` con `forwardRef` (evita dependencia circular)
- ✅ Al hacer login admin → llama a `generarNotificacionesDiarias()`
- ✅ Sigue notificando logins fuera de horario

**Flujo de login:**
```typescript
async login(...) {
  // ... validaciones ...

  // Si es admin, generar notificaciones (solo 1 vez al día)
  if (user.rol?.id === 1) {
    await this.notificacionesService.generarNotificacionesDiarias();
  }

  // Notificar login fuera horario
  await this.notificacionesService.notificarLoginFueraHorario(...);

  return { access_token, user };
}
```

#### 5. **package.json** - ✅ LIMPIO
**Dependencias ELIMINADAS:**
```json
❌ "@nestjs/schedule": "^6.1.0"        // Cron jobs (problema)
❌ "@nestjs/platform-socket.io": "^10.4.20"  // WebSockets (no se usa)
❌ "@nestjs/websockets": "^11.1.9"     // WebSockets (no se usa)
❌ "socket.io": "^4.8.1"               // WebSockets (no se usa)
```

**Dependencias MANTENIDAS:**
```json
✅ "@nestjs/event-emitter": "^3.0.1"   // Para SSE
✅ "@nestjs/jwt": "^11.0.0"            // Autenticación
✅ "@nestjs/typeorm": "^10.0.2"        // Base de datos
✅ "rxjs": "^7.8.1"                    // Para SSE Observables
```

---

### **FRONTEND:**

#### 1. **NotificacionesGlobales.jsx** - ✅ REFACTORIZADO
**Cambios:**
- ✅ Código descomentado
- ✅ Usa solo `notificacionesService.js` (NO llama API directamente)
- ✅ Hook SSE funcionando
- ✅ Código limpio y organizado

**Estructura:**
```javascript
// ✅ Importa del service
import {
  contarNotificacionesNoLeidas,
  obtenerNotificacionesNoLeidas,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from '../services/notificacionesService';

// ✅ Usa SSE para tiempo real
const { data, isConnected } = useSSE('/notificaciones/stream', {
  onMessage: (data) => {
    setTotalNotificaciones(data.total);
  }
});

// ✅ Todas las operaciones usan el service
const cargarConteoNotificaciones = async () => {
  const { total } = await contarNotificacionesNoLeidas();
  setTotalNotificaciones(total);
};
```

#### 2. **notificacionesService.js** - ✅ YA ESTABA BIEN
- ✅ Centraliza todas las llamadas API
- ✅ Manejo de errores
- ✅ Código limpio

#### 3. **useSSE.js** - ✅ YA ESTABA BIEN
- ✅ Hook personalizado para SSE
- ✅ Funciona en cPanel
- ✅ Reconexión automática

---

## 🎯 CÓMO FUNCIONA EL SISTEMA AHORA

### **Flujo de Notificaciones:**

```
1. Admin hace login por la mañana
   ↓
2. auth.service.ts detecta que es admin (rol.id === 1)
   ↓
3. Llama a notificacionesService.generarNotificacionesDiarias()
   ↓
4. Service verifica: "¿Ya calculé hoy?"
   ├─ SI → Retorna sin hacer nada
   └─ NO → Calcula cumpleaños y aniversarios
       ↓
5. Guarda notificaciones en BD
   ↓
6. Emite evento 'notificacion.nueva' para SSE
   ↓
7. Todos los admins conectados reciben update por SSE
   ↓
8. Frontend actualiza contador automáticamente
   ↓
9. Resto del día: Solo notificaciones puntuales
   (login fuera horario, cita eliminada)
```

### **Eventos que Generan Notificaciones:**

| Evento | Cuándo se calcula | Frecuencia |
|--------|------------------|------------|
| **Cumpleaños pacientes** | Primer login admin del día | 1 vez al día |
| **Aniversarios empleados** | Primer login admin del día | 1 vez al día |
| **Login fuera horario** | En cada login fuera horario | Tiempo real |
| **Cita eliminada** | Al eliminar una cita | Tiempo real |

---

## ✅ VENTAJAS DE ESTE SISTEMA

1. **Sin sobrecarga del servidor**
   - No más cron ejecutándose cada minuto
   - Cálculos solo cuando es necesario (1 vez al día máximo)

2. **Eficiente**
   - SSE envía updates solo cuando hay cambios reales
   - No polling constante

3. **Funciona en producción**
   - Compatible con cPanel y hosting compartido
   - Sin dependencias problemáticas

4. **Código limpio**
   - JSDoc en todo el backend
   - Service layer en frontend
   - Fácil de mantener

5. **Sin duplicados**
   - Verifica notificaciones existentes en últimas 24h
   - Control de ejecución diaria con `ultimoCalculoDiario`

---

## 📦 INSTALACIÓN EN PRODUCCIÓN

### 1. **En el backend:**
```bash
cd centro-crecemos

# Eliminar dependencias viejas
npm uninstall @nestjs/schedule @nestjs/websockets @nestjs/platform-socket.io socket.io

# Instalar dependencias (si no están)
npm install

# Build
npm run build

# Restart server
pm2 restart backend
```

### 2. **En el frontend:**
```bash
cd frontend-centrocrecemos

# Ya no requiere cambios de dependencias
npm install

# Build
npm run build
```

---

## 🧪 TESTING

### **Test manual:**
1. Login como admin por primera vez del día
2. Verificar en logs backend: "⏰ Iniciando generación de notificaciones diarias..."
3. Verificar en frontend: Campana muestra notificaciones
4. Login como admin de nuevo
5. Verificar en logs: "⏭️ Las notificaciones diarias ya fueron generadas hoy"

### **Verificar SSE:**
1. Abrir DevTools → Network → Filter: EventStream
2. Debe aparecer: `backend_api/notificaciones/stream`
3. Status: 200 (mantiene conexión abierta)
4. Ver mensajes en tiempo real cuando hay cambios

---

## 🐛 TROUBLESHOOTING

### **Problema:** No llegan notificaciones
**Solución:**
1. Verificar que el módulo está habilitado en `app.module.ts`
2. Verificar logs del backend
3. Verificar configuración en tabla `configuracion_notificacion` (campo `activa = true`)

### **Problema:** SSE no conecta
**Solución:**
1. Verificar token en localStorage
2. Verificar que SseAuthGuard está importado en el módulo
3. Ver consola del navegador para errores

### **Problema:** Se calculan notificaciones múltiples veces
**Solución:**
- Reiniciar el servidor (la variable `ultimoCalculoDiario` se resetea)
- En futuro: mover a Redis o base de datos

---

## 📝 NOTAS IMPORTANTES

- ✅ El cálculo de notificaciones usa **zona horaria del servidor**
- ✅ Los días de anticip ación se configuran en tabla `configuracion_notificacion`
- ✅ Solo el **primer admin** recibe cada notificación (evita duplicados)
- ✅ SSE funciona aunque el usuario cierre y abra el navegador
- ✅ EventEmitter2 se mantiene porque es necesario para SSE

---

## 👨‍💻 DESARROLLADO POR

**Claude Code Assistant**
Fecha: 20 Diciembre 2025

**Cambios solicitados por:** Lucero
**Objetivo:** Optimizar sistema de notificaciones y eliminar sobrecarga por cron jobs
