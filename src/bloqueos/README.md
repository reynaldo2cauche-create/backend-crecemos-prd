# 🔒 Sistema de Bloqueos de Horarios

## 📋 GUÍA PASO A PASO: Cómo Verificar que Todo Funciona

---

## PASO 1: Ejecutar el SQL 🗄️

### Opción A: MySQL Workbench
1. Abre MySQL Workbench
2. Conecta a tu base de datos
3. Abre el archivo: `src/bloqueos/setup-bloqueos.sql`
4. Click en el rayo ⚡ (Execute)
5. Deberías ver: "✅ Tabla tipo_bloqueo creada"

### Opción B: Línea de Comandos
```bash
cd C:\Users\Lucero\Desktop\centro-crecemos
mysql -u root -p nombre_base_datos < src/bloqueos/setup-bloqueos.sql
```

### ✅ Verificación Rápida
Ejecuta este comando SQL:
```sql
SELECT * FROM tipo_bloqueo;
```

**Deberías ver 2 registros:**
| id | codigo | nombre |
|----|--------|--------|
| 1 | PUNTUAL | Bloqueo Puntual |
| 2 | RECURRENTE | Bloqueo Recurrente |

---

## PASO 2: Verificar las Tablas 🔍

Ejecuta el script de verificación:

1. Abre: `src/bloqueos/verificar-bloqueos.sql` en MySQL Workbench
2. Ejecuta todo el script
3. Revisa los resultados

**Deberías ver:**
- ✅ 2 tablas encontradas (`tipo_bloqueo`, `bloqueo_horarios`)
- ✅ 2 tipos de bloqueo activos
- ✅ Estructura correcta de `bloqueo_horarios`

---

## PASO 3: Reiniciar el Backend 🚀

```bash
cd C:\Users\Lucero\Desktop\centro-crecemos
npm run start:dev
```

**Busca en la consola:**
```
[Nest] BloqueosModule dependencies initialized
[Nest] BloqueosController {/bloqueos}:
```

Si ves errores, verifica que ejecutaste el SQL correctamente.

---

## PASO 4: Probar los Endpoints 🧪

### Opción A: Visual Studio Code (REST Client)

1. Instala la extensión "REST Client" en VSCode
2. Abre: `src/bloqueos/test.http`
3. Click en "Send Request" sobre cada línea que dice `###`
4. Verás las respuestas en el panel derecho

### Opción B: Postman

1. Importa la guía: `src/bloqueos/test-endpoints.md`
2. Sigue las instrucciones de cada endpoint
3. Verifica que las respuestas sean correctas

### Opción C: Navegador (Solo GET)

Abre en el navegador:
```
http://localhost:3000/backend_api/catalogos/tipo-bloqueo
```

Deberías ver el JSON con los 2 tipos de bloqueo.

---

## PASO 5: Crear un Bloqueo de Prueba 📝

### Usando Postman/REST Client:

**POST** `http://localhost:3000/bloqueos`

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
  "motivo": "PRUEBA - Día de cumpleaños",
  "userIdCrea": 1
}
```

**Nota:** Cambia `trabajadorId` y `userIdCrea` por IDs válidos de tu base de datos.

### ✅ Verificación en Base de Datos

```sql
SELECT * FROM bloqueo_horarios WHERE activo = TRUE;
```

Deberías ver tu bloqueo creado.

---

## PASO 6: Verificar en el Frontend 🎨

### 1. Levantar el Frontend

```bash
cd C:\Users\Lucero\Desktop\frontend-centrocrecemos
npm start
```

### 2. Agregar Vista de Bloqueos a tu Aplicación

En tu página de Agenda o Admin, agrega:

```jsx
import ListaBloqueos from '../components/Agenda/ListaBloqueos';

// Dentro de tu componente:
<ListaBloqueos
  terapeutas={trabajadores}
  userId={currentUser.id}
/>
```

### 3. Probar el Modal

La `ListaBloqueos` ya incluye el botón "+ Nuevo Bloqueo" que abre `ModalBloquearHorario`.

**Acciones a probar:**
- ✅ Click en "Nuevo Bloqueo"
- ✅ Seleccionar terapeuta
- ✅ Elegir tipo: Puntual o Recurrente
- ✅ Llenar fechas y horarios
- ✅ Escribir motivo
- ✅ Click en "Bloquear Horario"
- ✅ Verificar que aparece en la lista

---

## PASO 7: Verificar en Consola del Navegador 🖥️

Abre DevTools (F12) y ejecuta en la consola:

```javascript
// Verificar que el servicio se cargó
fetch('http://localhost:3000/backend_api/catalogos/tipo-bloqueo')
  .then(r => r.json())
  .then(data => console.log('Tipos de bloqueo:', data));

// Verificar bloqueos activos
fetch('http://localhost:3000/bloqueos/activos')
  .then(r => r.json())
  .then(data => console.log('Bloqueos activos:', data));

// Verificar si un horario está bloqueado
fetch('http://localhost:3000/bloqueos/verificar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trabajadorId: 1,
    fecha: '2026-03-20',
    hora: '10:00:00'
  })
})
  .then(r => r.json())
  .then(data => console.log('Está bloqueado?', data));
```

---

## 🔍 Checklist de Verificación Completa

### Backend
- [ ] SQL ejecutado sin errores
- [ ] Tabla `tipo_bloqueo` tiene 2 registros
- [ ] Tabla `bloqueo_horarios` creada correctamente
- [ ] Backend reiniciado sin errores
- [ ] Endpoint `/catalogos/tipo-bloqueo` funciona
- [ ] Endpoint `/bloqueos` funciona (GET)
- [ ] Puedo crear un bloqueo (POST)
- [ ] El bloqueo aparece en la base de datos

### Frontend
- [ ] Servicio `bloqueoService.js` creado
- [ ] Función `getTipoBloqueo()` agregada a `catalogoService.js`
- [ ] Componente `ModalBloquearHorario` creado
- [ ] Componente `ListaBloqueos` creado
- [ ] Frontend levantado sin errores
- [ ] Modal de bloqueo se abre correctamente
- [ ] Puedo crear un bloqueo desde el frontend
- [ ] El bloqueo aparece en la lista

---

## 🐛 Solución de Problemas

### ❌ Error: "Table 'tipo_bloqueo' doesn't exist"
**Solución:** Ejecuta el SQL nuevamente

### ❌ Error: "Cannot find module './bloqueos/bloqueos.module'"
**Solución:** Verifica que todos los archivos del backend estén creados en `src/bloqueos/`

### ❌ Error 400: "trabajadorId must be a number"
**Solución:** Asegúrate de enviar números, no strings: `"trabajadorId": 1` (sin comillas en el valor)

### ❌ Frontend: "Cannot read property 'map' of undefined"
**Solución:** Verifica que estás pasando el prop `terapeutas` a `ListaBloqueos`

### ❌ No aparecen los bloqueos en la lista
**Solución:** Verifica en la base de datos que `activo = TRUE` y `fecha_fin >= CURDATE()`

---

## 📊 Queries Útiles para Debugging

### Ver todos los bloqueos (incluso inactivos)
```sql
SELECT * FROM bloqueo_horarios;
```

### Ver bloqueos con información completa
```sql
SELECT
  b.id,
  CONCAT(t.nombres, ' ', t.apellidos) AS terapeuta,
  tb.nombre AS tipo,
  b.fecha_inicio,
  b.fecha_fin,
  b.motivo,
  b.activo
FROM bloqueo_horarios b
JOIN trabajador_centro t ON b.trabajador_id = t.id
JOIN tipo_bloqueo tb ON b.tipo_bloqueo_id = tb.id;
```

### Limpiar bloqueos de prueba
```sql
DELETE FROM bloqueo_horarios WHERE motivo LIKE '%PRUEBA%';
```

---

## 📞 Próximos Pasos

Una vez verificado que todo funciona:

1. **Integrar con Modal de Agendar Cita**
   - Usar `verificarHorarioBloqueado()` antes de permitir agendar
   - Filtrar horarios bloqueados de la lista de horarios disponibles

2. **Agregar Permisos**
   - Solo admins pueden crear/eliminar bloqueos
   - Otros roles solo pueden ver

3. **Notificaciones**
   - Avisar cuando se crea un bloqueo
   - Recordar bloqueos próximos a vencer

---

## ✅ ¡Listo!

Si completaste todos los pasos del checklist, el sistema está funcionando correctamente. 🎉

**Archivos de ayuda:**
- 📄 `setup-bloqueos.sql` - Instalación inicial
- 🔍 `verificar-bloqueos.sql` - Verificación en BD
- 🧪 `test.http` - Testing de endpoints
- 📖 `test-endpoints.md` - Documentación completa de API
- 📘 `README.md` - Este archivo
