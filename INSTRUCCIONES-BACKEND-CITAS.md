# 🚀 INSTRUCCIONES COMPLETAS PARA EL BACKEND DE CITAS

Ya ejecutaste el SQL correctamente. Ahora necesito que hagas lo siguiente:

## 📁 ARCHIVOS QUE VOY A CREAR:

Voy a crear estos archivos en tu backend:

```
src/citas/
├── entities/
│   ├── tipo-cita.entity.ts ✅ (CREADO)
│   ├── motivo-cita.entity.ts ✅ (CREADO)
│   ├── cita.entity.ts (ACTUALIZAR)
│   ├── cita-reunion-clinica.entity.ts (ACTUALIZAR)
│   ├── cita-reunion-clinica-terapeutas.entity.ts (ACTUALIZAR)
│   ├── cita-reunion-clinica-servicios.entity.ts (ACTUALIZAR)
│   └── cita-visita-escolar.entity.ts (ACTUALIZAR)
├── dto/
│   ├── crear-cita.dto.ts (CREAR)
│   ├── crear-reunion-clinica.dto.ts (CREAR)
│   └── crear-visita-escolar.dto.ts (CREAR)
├── citas.service.ts (ACTUALIZAR COMPLETAMENTE)
├── citas.controller.ts (ACTUALIZAR)
└── citas.module.ts (ACTUALIZAR)
```

## ⚠️ PROBLEMA DE TOKENS

Tengo un límite de tokens, así que necesito que me confirmes si quieres que:

**OPCIÓN A:** Te doy los archivos completos uno por uno (me tomar varios mensajes)

**OPCIÓN B:** Te doy un script que genera TODOS los archivos de una vez

**¿Cuál prefieres?** Responde solo "A" o "B" y continúo.

---

## 📋 RESUMEN DE LO QUE HARÁ EL BACKEND:

### **POST /backend_api/citas** - Crear cita
Detecta automáticamente el tipo de cita según el `motivo_id` y guarda en la tabla correcta:

- **Motivo 1-5** → Guarda en `citas` (NORMAL)
- **Motivo 6** → Guarda en `cita_reunion_clinica` + terapeutas + servicios
- **Motivo 7** → Guarda en `cita_visita_escolar`

### **GET /backend_api/citas** - Listar citas
Devuelve TODAS las citas (de las 3 tablas unificadas) con el formato que espera el frontend.

### **PUT /backend_api/citas/:id** - Actualizar cita
Actualiza en la tabla correspondiente.

### **DELETE /backend_api/citas/:id** - Eliminar cita
Elimina de la tabla correspondiente.

---

**Esperando tu respuesta: A o B**
