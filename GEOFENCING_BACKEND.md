# 🔒 Geofencing Backend - Centro Crecemos

## Resumen

El backend de geofencing valida la ubicación del usuario en cada petición HTTP sensible, asegurando que solo puedan acceder a información de pacientes cuando están físicamente en el centro de labores.

## 📂 Arquitectura

### Archivos creados:

```
src/
├── geofencing/
│   ├── geofencing.module.ts         # Módulo de geofencing
│   ├── geofencing.service.ts        # Servicio con lógica de Haversine
│   ├── geofencing.guard.ts          # Guard para validar ubicación
│   └── requiere-ubicacion.decorator.ts  # Decorator @RequiereUbicacion()
```

## 🛠️ Componentes

### 1. GeofencingService

**Archivo**: `src/geofencing/geofencing.service.ts`

Servicio que calcula distancias GPS usando la fórmula de Haversine.

```typescript
export class GeofencingService {
  private readonly CENTRO_LAT = -11.9389;  // El Pinar, Comas
  private readonly CENTRO_LNG = -77.0445;
  private readonly RADIO_PERMITIDO_METROS = 100;

  verificarPerimetro(lat: number, lng: number): boolean
  obtenerDistancia(lat: number, lng: number): number
}
```

### 2. GeofencingGuard

**Archivo**: `src/geofencing/geofencing.guard.ts`

Guard de NestJS que intercepta las peticiones y valida la ubicación.

**Funcionamiento**:
1. Verifica si la ruta requiere geofencing (`@RequiereUbicacion()`)
2. Verifica si el rol del usuario requiere validación (Terapeuta=4, Admisión=2)
3. Obtiene coordenadas desde headers HTTP (`x-user-latitude`, `x-user-longitude`)
4. Calcula distancia al centro
5. Permite o rechaza el acceso

**Códigos de error**:
- `400 UBICACION_REQUERIDA`: No se enviaron coordenadas GPS
- `400 COORDENADAS_INVALIDAS`: Coordenadas con formato incorrecto
- `403 FUERA_DEL_PERIMETRO`: Usuario está fuera de los 100 metros

### 3. @RequiereUbicacion() Decorator

**Archivo**: `src/geofencing/requiere-ubicacion.decorator.ts`

Decorator para marcar rutas que requieren validación de ubicación.

```typescript
@Controller('backend_api/pacientes')
@UseGuards(JwtAuthGuard, GeofencingGuard)  // Activar guard
export class PacienteController {

  @Get()
  @RequiereUbicacion()  // Esta ruta requiere geofencing
  findAll() { /* ... */ }

  @Get(':id')
  // Sin decorator = No requiere geofencing
  findOne() { /* ... */ }
}
```

## 🚀 Uso

### Aplicar geofencing a un controlador:

**Paso 1**: Importar guard y decorator

```typescript
import { GeofencingGuard } from 'src/geofencing/geofencing.guard';
import { RequiereUbicacion } from 'src/geofencing/requiere-ubicacion.decorator';
```

**Paso 2**: Activar guard en el controlador

```typescript
@Controller('backend_api/tu-ruta')
@UseGuards(JwtAuthGuard, GeofencingGuard)  // ⚠️ Agregar GeofencingGuard
export class TuController {
  // ...
}
```

**Paso 3**: Marcar rutas sensibles

```typescript
@Get('datos-sensibles')
@RequiereUbicacion()  // ✅ Solo accesible dentro del perímetro
async obtenerDatosSensibles() {
  // ...
}

@Get('datos-publicos')
// ⚠️ Sin decorator = Accesible desde cualquier lugar
async obtenerDatosPublicos() {
  // ...
}
```

## 📋 Rutas protegidas actualmente

### PacienteController (`/backend_api/pacientes`)

✅ Rutas protegidas con `@RequiereUbicacion()`:
- `GET /pacientes` - Listar pacientes
- `GET /pacientes/all` - Listar todos (incluyendo inactivos)
- `GET /pacientes/estadisticas` - Estadísticas

❌ Rutas públicas (sin decorator):
- `POST /pacientes/completo` - Registro público de pacientes

## 🔄 Flujo de validación

```
1. Cliente (Frontend) envía request
   ├─ Headers: Authorization: Bearer token
   ├─ Headers: x-user-latitude: -11.9389
   └─ Headers: x-user-longitude: -77.0445

2. Backend recibe request
   └─ JwtAuthGuard valida token ✅

3. GeofencingGuard se ejecuta
   ├─ ¿Ruta tiene @RequiereUbicacion()? → SÍ
   ├─ ¿Usuario es Terapeuta o Admisión? → SÍ
   ├─ ¿Headers tienen coordenadas? → SÍ
   ├─ Calcular distancia con Haversine
   ├─ Distancia: 45 metros
   └─ ¿45m <= 100m? → ✅ PERMITIR

4. Controlador ejecuta la lógica
   └─ Retorna datos del paciente

5. Response enviado al cliente
```

## ⚠️ Roles que requieren geofencing

Solo se valida ubicación para:

```typescript
const rolesQueRequierenGeofencing = [2, 4];
// 2 = Admisión
// 4 = Terapeuta
```

Otros roles (Administrador, etc.) **NO** tienen restricción de ubicación.

## 🧪 Testing

### Probar geofencing localmente:

1. **Modificar coordenadas del centro** (para testing):

```typescript
// src/geofencing/geofencing.service.ts
private readonly CENTRO_LAT = TU_LATITUD_ACTUAL;
private readonly CENTRO_LNG = TU_LONGITUD_ACTUAL;
```

2. **Aumentar radio permitido** (para testing):

```typescript
private readonly RADIO_PERMITIDO_METROS = 5000; // 5 km
```

3. **Ver logs en consola**:

```bash
npm run start:dev

# Logs esperados:
📍 Verificando perímetro:
   - Ubicación usuario: -11.9389, -77.0445
   - Distancia al centro: 45.23 metros
   - Dentro del perímetro: true
✅ Acceso permitido - Usuario 123 dentro del perímetro
```

## 🐛 Solución de Problemas

### Error: "UBICACION_REQUERIDA"

**Causa**: Frontend no envió coordenadas GPS en los headers.

**Solución**: Verificar que el interceptor HTTP esté agregando las coordenadas.

### Error: "FUERA_DEL_PERIMETRO"

**Causa**: Usuario está a más de 100 metros del centro.

**Solución**:
- Usuario debe ir al centro físicamente
- O acceder solo a rutas permitidas (Agenda, Webmail)

### Error: "COORDENADAS_INVALIDAS"

**Causa**: Coordenadas con formato incorrecto.

**Solución**: Verificar que lat esté entre -90 y 90, lng entre -180 y 180.

## 📊 Respuestas de error

### 403 FUERA_DEL_PERIMETRO

```json
{
  "statusCode": 403,
  "message": "Acceso denegado por ubicación",
  "code": "FUERA_DEL_PERIMETRO",
  "details": {
    "distancia": 250,
    "radioPermitido": 100,
    "mensaje": "Debes estar dentro de 100 metros del centro de labores..."
  }
}
```

### 400 UBICACION_REQUERIDA

```json
{
  "statusCode": 400,
  "message": "Se requiere ubicación para acceder a esta sección",
  "code": "UBICACION_REQUERIDA",
  "details": "Por favor, permite el acceso a tu ubicación GPS"
}
```

## 🔐 Seguridad

### Ventajas:
- ✅ Validación en servidor (no se puede bypasear desde frontend)
- ✅ Coordenadas verificadas en cada request
- ✅ Logs de acceso por ubicación

### Limitaciones:
- ⚠️ Usuario puede falsificar coordenadas GPS (requiere herramientas avanzadas)
- ⚠️ Precisión GPS varía (5-50 metros)
- ⚠️ Funciona solo con HTTPS en producción

### Mejoras futuras:
- Guardar logs de ubicación en base de datos
- Alertas si detecta coordenadas sospechosas
- Verificación adicional con IP del usuario

## 📞 Mantenimiento

### Cambiar coordenadas del centro:

```typescript
// src/geofencing/geofencing.service.ts
private readonly CENTRO_LAT = -11.NUEVA;
private readonly CENTRO_LNG = -77.NUEVA;
```

### Cambiar radio permitido:

```typescript
private readonly RADIO_PERMITIDO_METROS = 200; // 200 metros
```

### Agregar nuevos roles que requieren geofencing:

```typescript
// src/geofencing/geofencing.guard.ts
const rolesQueRequierenGeofencing = [2, 4, 5]; // Agregar rol 5
```

---

**Última actualización**: Febrero 2026
**Versión**: 1.0.0
**Autor**: Sistema Centro Crecemos
