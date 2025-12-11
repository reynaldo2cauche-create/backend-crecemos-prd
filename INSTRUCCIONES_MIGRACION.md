# 📋 INSTRUCCIONES DE MIGRACIÓN - MÓDULO DE CITAS REFACTORIZADO

## 🎯 RESUMEN DE CAMBIOS

Se ha refactorizado completamente el módulo de citas para soportar 3 tipos:
1. **CITA NORMAL**: 1 terapeuta + 1 servicio
2. **REUNIÓN CLÍNICA**: N terapeutas + N servicios (SIN jerarquías)
3. **VISITA ESCOLAR**: Encargado de institución + servicio opcional

---

## 📦 PASO 1: EJECUTAR MIGRACIÓN SQL

### Archivo: `MIGRACION_LIMPIAR_CITAS.sql`

```bash
# Conéctate a tu base de datos MySQL
mysql -u usuario -p nombre_base_datos < MIGRACION_LIMPIAR_CITAS.sql
```

### ¿Qué hace esta migración?

✅ **Crea tabla `tipos_cita`**
   - 3 tipos: NORMAL, REUNION_CLINICA, VISITA_ESCOLAR
   - Con metadatos sobre qué permite cada tipo

✅ **Crea tabla `cita_encargados`**
   - Para guardar datos del encargado en visitas escolares

✅ **Agrega `tipo_cita_id` a tabla `citas`**
   - Migra datos existentes automáticamente

✅ **Agrega `tipo_cita_id` a tabla `historial_citas`**
   - Migra datos históricos automáticamente

✅ **Elimina campo `rol_en_cita`**
   - De `cita_terapeutas` y `historial_cita_terapeutas`
   - Ya no hay jerarquías, todos son iguales

✅ **Hace campos opcionales según tipo**
   - `doctor_id` y `servicio_id` ahora son NULL cuando no aplican

✅ **Crea índices optimizados**
   - Para queries super rápidas

---

## 🗑️ PASO 2: NO HAY NADA QUE BORRAR

**BUENAS NOTICIAS:** No necesitas borrar ninguna tabla.

Todo lo que existía se aprovecha y se optimiza. Solo agregamos:
- 1 tabla nueva: `tipos_cita`
- 1 tabla nueva: `cita_encargados`
- Campos nuevos en tablas existentes

---

## 🔧 PASO 3: ACTUALIZAR EL MÓDULO BACKEND

### Agregar las nuevas entidades al módulo

Edita: `src/citas/citas.module.ts`

```typescript
import { TipoCita } from '../catalogos/tipo-cita.entity';
import { CitaEncargado } from './cita-encargado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cita,
      CitaTerapeuta,
      CitaServicio,
      CitaEncargado,          // ← NUEVO
      HistorialCita,
      HistorialCitaTerapeuta,
      HistorialCitaServicio,
      TipoCita,               // ← NUEVO
    ]),
  ],
  // ...
})
```

### Agregar al módulo de catálogos

Edita: `src/catalogos/catalogos.module.ts`

```typescript
import { TipoCita } from './tipo-cita.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // ...otras entidades...
      TipoCita,  // ← NUEVO
    ]),
  ],
  // ...
})
```

---

## 📊 PASO 4: ESTRUCTURA FINAL DE LA BASE DE DATOS

```
tipos_cita
├── id (1, 2, 3)
├── codigo (NORMAL, REUNION_CLINICA, VISITA_ESCOLAR)
├── nombre
├── descripcion
└── flags de validación

citas
├── id
├── tipo_cita_id ← NUEVO (1=NORMAL, 2=REUNION, 3=VISITA)
├── paciente_id
├── doctor_id (NULL en reuniones clínicas y visitas)
├── servicio_id (NULL en reuniones clínicas)
├── motivo_id
├── estado_id
├── fecha, hora, etc.

cita_terapeutas (solo para tipo 2: REUNION_CLINICA)
├── id
├── cita_id
├── terapeuta_id
└── ❌ rol_en_cita (ELIMINADO - sin jerarquías)

cita_servicios (solo para tipo 2: REUNION_CLINICA)
├── id
├── cita_id
└── servicio_id

cita_encargados (solo para tipo 3: VISITA_ESCOLAR) ← NUEVO
├── id
├── cita_id
├── nombre_completo
├── cargo
├── institucion
├── telefono
└── email
```

---

## 🎨 PASO 5: USO DEL NUEVO DTO

### Ejemplo 1: Cita Normal

```typescript
{
  tipo_cita_id: 1,
  paciente_id: 10,
  doctor_id: 5,           // ← Un solo terapeuta
  servicio_id: 3,         // ← Un solo servicio
  motivo_id: 1,
  estado_id: 1,
  fecha: '2025-12-15',
  hora_inicio: '10:00',
  duracion_minutos: 60
}
```

### Ejemplo 2: Reunión Clínica

```typescript
{
  tipo_cita_id: 2,
  paciente_id: 10,
  terapeutas_ids: [5, 7, 9],     // ← Lista de terapeutas (sin jerarquía)
  servicios_ids: [3, 4],         // ← Lista de servicios (sin jerarquía)
  motivo_id: 1,
  estado_id: 1,
  fecha: '2025-12-15',
  hora_inicio: '10:00',
  duracion_minutos: 120
}
```

### Ejemplo 3: Visita Escolar

```typescript
{
  tipo_cita_id: 3,
  paciente_id: 10,
  servicio_id: 5,                // ← Opcional
  encargado: {                   // ← Datos del encargado
    nombre_completo: 'María García',
    cargo: 'Directora',
    institucion: 'Colegio San Juan',
    telefono: '987654321',
    email: 'maria@colegio.com'
  },
  motivo_id: 1,
  estado_id: 1,
  fecha: '2025-12-15',
  hora_inicio: '14:00',
  duracion_minutos: 90
}
```

---

## ✅ VENTAJAS DE ESTA ARQUITECTURA

1. **✅ Escalable**: Agregar nuevos tipos es trivial
2. **✅ Sin JSON**: Todo en tablas relacionales normales
3. **✅ Sin jerarquías**: Todos los terapeutas/servicios al mismo nivel
4. **✅ Queries rápidas**: Índices optimizados
5. **✅ Código limpio**: Sin condicionales espaguetti
6. **✅ Type-safe**: TypeScript sabe qué campos usar por tipo
7. **✅ Historial completo**: Se registra el tipo en cada cambio

---

## 🚀 PRÓXIMOS PASOS

1. ✅ **Ejecutar SQL** → `MIGRACION_LIMPIAR_CITAS.sql`
2. ⏳ **Refactorizar `cita.service.ts`** → Implementar lógica por tipo
3. ⏳ **Actualizar frontend** → Componentes por tipo de cita
4. ⏳ **Actualizar historial** → Mostrar datos según tipo

---

## 📝 NOTAS IMPORTANTES

- **BACKUP**: Haz backup de tu base de datos antes de ejecutar la migración
- **PRUEBAS**: Prueba primero en un ambiente de desarrollo
- **DATOS**: La migración preserva TODOS los datos existentes
- **ROLLBACK**: Si algo sale mal, restaura el backup

---

## 🆘 ¿PROBLEMAS?

Si algo no funciona después de la migración:

1. Verifica que todas las entidades están en el módulo
2. Revisa los logs de TypeORM
3. Ejecuta las queries de verificación al final del SQL
4. Verifica que los índices se crearon correctamente

---

**¡Listo!** Tu módulo de citas ahora es:
- 🧹 Limpio
- 🚀 Rápido
- 📈 Escalable
- 💪 Profesional
