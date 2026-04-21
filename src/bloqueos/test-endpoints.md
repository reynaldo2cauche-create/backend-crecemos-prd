# 🧪 Testing de Endpoints - Sistema de Bloqueos

## Requisitos
- Backend corriendo en: `http://localhost:3000`
- SQL ejecutado correctamente
- Usuario admin con ID conocido

---

## 1️⃣ Obtener Tipos de Bloqueo

**GET** `http://localhost:3000/backend_api/catalogos/tipo-bloqueo`

**Respuesta esperada:**
```json
[
  {
    "id": 1,
    "codigo": "PUNTUAL",
    "nombre": "Bloqueo Puntual",
    "descripcion": "Bloqueo para una fecha específica...",
    "activo": true
  },
  {
    "id": 2,
    "codigo": "RECURRENTE",
    "nombre": "Bloqueo Recurrente",
    "descripcion": "Bloqueo que se repite semanalmente...",
    "activo": true
  }
]
```

---

## 2️⃣ Crear Bloqueo Puntual (todo el día)

**POST** `http://localhost:3000/bloqueos`

**Body (JSON):**
```json
{
  "trabajadorId": 1,
  "tipoBloqueoId": 1,
  "fechaInicio": "2026-03-20",
  "fechaFin": "2026-03-20",
  "diaSemana": null,
  "todoElDia": true,
  "horaInicio": null,
  "horaFin": null,
  "motivo": "Día de cumpleaños - Permiso personal",
  "userIdCrea": 1
}
```

**Respuesta esperada:**
```json
{
  "id": 1,
  "trabajadorId": 1,
  "tipoBloqueoId": 1,
  "fechaInicio": "2026-03-20",
  "fechaFin": "2026-03-20",
  "diaSemana": null,
  "todoElDia": true,
  "horaInicio": null,
  "horaFin": null,
  "motivo": "Día de cumpleaños - Permiso personal",
  "activo": true,
  "userIdCrea": 1,
  "createdAt": "2026-03-06T...",
  "updatedAt": "2026-03-06T..."
}
```

---

## 3️⃣ Crear Bloqueo Puntual (horario específico)

**POST** `http://localhost:3000/bloqueos`

**Body (JSON):**
```json
{
  "trabajadorId": 1,
  "tipoBloqueoId": 1,
  "fechaInicio": "2026-03-15",
  "fechaFin": "2026-03-15",
  "diaSemana": null,
  "todoElDia": false,
  "horaInicio": "14:00:00",
  "horaFin": "16:00:00",
  "motivo": "Cita médica particular",
  "userIdCrea": 1
}
```

---

## 4️⃣ Crear Bloqueo Recurrente (Martes de 8am-10am)

**POST** `http://localhost:3000/bloqueos`

**Body (JSON):**
```json
{
  "trabajadorId": 1,
  "tipoBloqueoId": 2,
  "fechaInicio": "2026-03-01",
  "fechaFin": "2026-03-31",
  "diaSemana": 2,
  "todoElDia": false,
  "horaInicio": "08:00:00",
  "horaFin": "10:00:00",
  "motivo": "Curso de especialización en terapia cognitivo-conductual",
  "userIdCrea": 1
}
```

**Nota:** `diaSemana` valores:
- 0 = Domingo
- 1 = Lunes
- 2 = Martes
- 3 = Miércoles
- 4 = Jueves
- 5 = Viernes
- 6 = Sábado

---

## 5️⃣ Obtener Todos los Bloqueos

**GET** `http://localhost:3000/bloqueos`

**Respuesta esperada:**
```json
[
  {
    "id": 1,
    "trabajadorId": 1,
    "trabajador": {
      "id": 1,
      "nombres": "María",
      "apellidos": "García",
      "especialidad": {
        "id": 1,
        "nombre": "Psicología Infantil"
      }
    },
    "tipoBloqueoId": 1,
    "tipoBloqueo": {
      "id": 1,
      "codigo": "PUNTUAL",
      "nombre": "Bloqueo Puntual"
    },
    "fechaInicio": "2026-03-20",
    "fechaFin": "2026-03-20",
    "todoElDia": true,
    "motivo": "Día de cumpleaños - Permiso personal",
    ...
  }
]
```

---

## 6️⃣ Obtener Solo Bloqueos Activos/Vigentes

**GET** `http://localhost:3000/bloqueos/activos`

Retorna solo bloqueos donde `activo=true` y `fecha_fin >= hoy`

---

## 7️⃣ Obtener Bloqueos de un Terapeuta

**GET** `http://localhost:3000/bloqueos/trabajador/1`

Retorna solo los bloqueos del trabajador con ID 1.

---

## 8️⃣ Verificar si un Horario está Bloqueado

**POST** `http://localhost:3000/bloqueos/verificar`

**Body (JSON):**
```json
{
  "trabajadorId": 1,
  "fecha": "2026-03-15",
  "hora": "14:30:00"
}
```

**Respuesta esperada:**
```json
{
  "bloqueado": true
}
```

o

```json
{
  "bloqueado": false
}
```

---

## 9️⃣ Obtener Horarios Disponibles

**GET** `http://localhost:3000/bloqueos/disponibles/1?fecha=2026-03-15&horaInicio=08:00:00&horaFin=18:00:00&intervalo=30`

**Parámetros:**
- `1` = trabajadorId
- `fecha` = fecha a consultar (YYYY-MM-DD)
- `horaInicio` = hora inicial (HH:MM:SS) - opcional, default: 08:00:00
- `horaFin` = hora final (HH:MM:SS) - opcional, default: 20:00:00
- `intervalo` = minutos entre slots - opcional, default: 30

**Respuesta esperada:**
```json
{
  "horarios": [
    "08:00:00",
    "08:30:00",
    "09:00:00",
    "09:30:00",
    "10:00:00",
    "10:30:00",
    ...
    "17:30:00"
  ]
}
```

Las horas bloqueadas NO aparecerán en esta lista.

---

## 🔟 Actualizar un Bloqueo

**PUT** `http://localhost:3000/bloqueos/1`

**Body (JSON):**
```json
{
  "motivo": "Curso de especialización actualizado - Ahora incluye práctica clínica",
  "userIdActua": 1
}
```

---

## 1️⃣1️⃣ Eliminar un Bloqueo (Soft Delete)

**DELETE** `http://localhost:3000/bloqueos/1?userId=1`

**Nota:** Es soft delete, solo marca `activo=false`.

**Respuesta esperada:** Status 200

---

## 🧪 Testing con Postman/Thunder Client

### Paso 1: Importar Collection

Crea una colección con todos estos endpoints.

### Paso 2: Crear Variables de Entorno

```
base_url = http://localhost:3000
trabajador_id = 1
user_id = 1
```

### Paso 3: Secuencia de Testing

1. ✅ GET tipos de bloqueo
2. ✅ POST crear bloqueo puntual
3. ✅ POST crear bloqueo recurrente
4. ✅ GET obtener todos los bloqueos
5. ✅ POST verificar horario bloqueado
6. ✅ GET obtener horarios disponibles
7. ✅ PUT actualizar bloqueo
8. ✅ DELETE eliminar bloqueo

---

## 🐛 Errores Comunes

### Error 400: "La fecha de fin debe ser mayor o igual a la fecha de inicio"
- Verifica que `fechaFin >= fechaInicio`

### Error 400: "Debe especificar hora de inicio y fin si no es todo el día"
- Si `todoElDia: false`, debes enviar `horaInicio` y `horaFin`

### Error 400: "Debe especificar el día de la semana para bloqueos recurrentes"
- Si `tipoBloqueoId: 2` (RECURRENTE), debes enviar `diaSemana` (0-6)

### Error 404: "Bloqueo con ID X no encontrado"
- El bloqueo no existe o está marcado como `activo: false`

---

## ✅ Checklist de Verificación

- [ ] Backend levantado sin errores
- [ ] SQL ejecutado correctamente
- [ ] Tabla `tipo_bloqueo` tiene 2 registros
- [ ] Tabla `bloqueo_horarios` existe con todos los campos
- [ ] Endpoint `/catalogos/tipo-bloqueo` funciona
- [ ] Puedo crear bloqueo puntual
- [ ] Puedo crear bloqueo recurrente
- [ ] Puedo listar bloqueos
- [ ] Puedo verificar horarios bloqueados
- [ ] Puedo obtener horarios disponibles
- [ ] Puedo actualizar un bloqueo
- [ ] Puedo eliminar un bloqueo
