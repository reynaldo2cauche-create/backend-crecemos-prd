# Cómo agregar nuevos tipos de notificaciones

## 📋 Resumen

El sistema de notificaciones está diseñado para ser **extensible** sin modificar la estructura de la base de datos.

## ✅ Pasos para agregar un nuevo tipo de notificación

### 1️⃣ Agregar configuración en la base de datos

Ejecuta este SQL (reemplaza los valores según tu necesidad):

```sql
INSERT INTO configuracion_notificaciones (tipo, activa, descripcion, dias_anticipacion)
VALUES ('MI_NUEVA_NOTIFICACION', 1, 'Descripción de mi notificación', 1);
```

**Campos:**
- `tipo`: Identificador único (MAYÚSCULAS_CON_GUION_BAJO)
- `activa`: 1 = activa, 0 = inactiva
- `descripcion`: Texto descriptivo para administradores
- `dias_anticipacion`: Cuántos días antes se debe notificar (0 = mismo día)

### 2️⃣ Implementar la lógica en el servicio

Abre `src/notificaciones/notificaciones.service.ts` y agrega tu lógica:

```typescript
// Ejemplo: Notificar cuando un producto está por vencer
private async generarNotificacionesProductosVencidos(): Promise<void> {
  try {
    // 1. Obtener configuración
    const config = await this.configRepo.findOne({
      where: { tipo: 'PRODUCTO_POR_VENCER', activa: true },
    });

    if (!config) {
      this.logger.warn('⚠️ Configuración de PRODUCTO_POR_VENCER no encontrada');
      return;
    }

    // 2. Obtener productos que están por vencer
    const productos = await this.productoRepo.find({
      where: { /* tu lógica aquí */ },
    });

    // 3. Crear notificaciones
    for (const producto of productos) {
      await this.crearYNotificar({
        tipo: 'PRODUCTO_POR_VENCER',
        usuarioId: adminId,
        titulo: '⚠️ Producto por vencer',
        mensaje: `El producto ${producto.nombre} vence en ${config.diasAnticipacion} días`,
        datosAdicionales: {
          producto_id: producto.id,
          fecha_vencimiento: producto.fechaVencimiento,
        },
      });
    }
  } catch (error) {
    this.logger.error('Error al generar notificaciones de productos:', error);
  }
}
```

### 3️⃣ Llamar la función desde `generarNotificacionesDiarias()`

Agrega tu función al método principal:

```typescript
async generarNotificacionesDiarias(): Promise<{ ejecutado: boolean; mensaje: string }> {
  // ... código existente ...

  try {
    await this.generarNotificacionesCumpleanos();
    await this.generarNotificacionesAniversario();
    await this.generarNotificacionesProductosVencidos(); // ⬅️ Tu nueva función

    // ... resto del código ...
  }
}
```

### 4️⃣ Agregar ícono en el frontend (opcional)

Abre `src/components/NotificacionesGlobales.jsx` y agrega tu ícono:

```javascript
const getIconoTipo = (tipo) => {
  const iconos = {
    CUMPLEANOS_PACIENTE: <CakeIcon className="w-5 h-5 text-pink-600" />,
    ANIVERSARIO_EMPLEADO: <CalendarIcon className="w-5 h-5 text-blue-600" />,
    PRODUCTO_POR_VENCER: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />,
    // ⬆️ Tu nuevo tipo
  };
  return iconos[tipo] || <InformationCircleIcon className="w-5 h-5 text-gray-600" />;
};

const getColorTipo = (tipo) => {
  const colores = {
    CUMPLEANOS_PACIENTE: 'bg-pink-50 border-pink-300',
    ANIVERSARIO_EMPLEADO: 'bg-blue-50 border-blue-300',
    PRODUCTO_POR_VENCER: 'bg-yellow-50 border-yellow-300',
    // ⬆️ Tu nuevo tipo
  };
  return colores[tipo] || 'bg-gray-50 border-gray-300';
};
```

## 🎯 Ventajas de este diseño

✅ **No requiere ALTER TABLE** - Solo inserta en `configuracion_notificaciones`
✅ **Fácil de activar/desactivar** - Cambia el campo `activa` en la configuración
✅ **Configurable** - Ajusta `dias_anticipacion` sin tocar código
✅ **Escalable** - Agrega cuantos tipos necesites

## 📝 Ejemplos de tipos de notificaciones

- `CUMPLEANOS_PACIENTE` - Cumpleaños de pacientes
- `ANIVERSARIO_EMPLEADO` - Aniversario laboral de empleados
- `LOGIN_FUERA_HORARIO` - Login fuera de horario
- `CITA_ELIMINADA` - Cita eliminada
- `PRODUCTO_POR_VENCER` - Producto próximo a vencer (ejemplo)
- `PAGO_PENDIENTE` - Pago pendiente de paciente (ejemplo)
- `SESION_COMPLETADA` - Sesión de terapia completada (ejemplo)

## ⚠️ Importante

- El campo `tipo` en `configuracion_notificaciones` debe coincidir exactamente con el que uses en el código
- Usa MAYÚSCULAS_CON_GUION_BAJO para los tipos
- No olvides compilar el backend después de modificar el código: `npm run build`
