# 📋 Sistema de Múltiples Responsables - Centro Crecemos

## 🎯 Descripción

Sistema implementado para permitir que un paciente menor de edad pueda tener **múltiples responsables** (padre, madre, tutor, etc.) en lugar de solo uno.

---

## 🗄️ Estructura de Base de Datos

### Nueva Tabla: `paciente_responsable`

```sql
CREATE TABLE paciente_responsable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,

  nombres VARCHAR(100) NOT NULL,
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100) DEFAULT NULL,

  tipo_documento_id INT DEFAULT NULL,
  numero_documento VARCHAR(20) DEFAULT NULL,

  responsable_relacion_id INT DEFAULT NULL,

  telefono VARCHAR(20) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,

  tiene_proceso_legal TINYINT(1) NOT NULL DEFAULT 0,

  orden TINYINT NOT NULL COMMENT '1 = principal, 2 = secundario, 3 = terciario',

  activo TINYINT(1) DEFAULT 1,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_pr_paciente
    FOREIGN KEY (paciente_id)
    REFERENCES paciente(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_pr_relacion
    FOREIGN KEY (responsable_relacion_id)
    REFERENCES responsable_relacion(id)
);
```

### Columnas Legacy (se mantienen en `paciente`)

Las columnas viejas de responsable en la tabla `paciente` **NO se eliminan** para mantener compatibilidad con datos existentes:

- `responsable_nombre`
- `responsable_apellido_paterno`
- `responsable_apellido_materno`
- `responsable_tipo_documento_id`
- `responsable_numero_documento`
- `responsable_relacion_id`
- `responsable_telefono`
- `responsable_email`

---

## 🔄 Estrategia de Migración Automática

### ¿Cómo funciona?

**El sistema usa un enfoque HÍBRIDO con migración automática on-demand:**

1. **Pacientes ANTIGUOS** (con datos en columnas legacy):
   - Los datos se leen de las columnas viejas de la tabla `paciente`
   - Se devuelven como si fueran de la tabla nueva (transparente para el frontend)

2. **Cuando se AGREGA un nuevo responsable** a un paciente antiguo:
   - El sistema detecta automáticamente que hay datos legacy
   - **Migra** el responsable viejo → tabla `paciente_responsable`
   - **Limpia** las columnas viejas (pone NULL)
   - **Inserta** el nuevo responsable en la tabla nueva

3. **Pacientes NUEVOS** (registrados después de la implementación):
   - Si envían `responsables` (array), se guardan en `paciente_responsable`
   - Si envían `responsable` (objeto único), se guarda en columnas legacy (compatibilidad)

---

## 📡 API Endpoints

### 1. Crear Paciente Completo con Múltiples Responsables

**Endpoint:** `POST /backend_api/pacientes/completo`

**Request Body (NUEVO - con array de responsables):**

```json
{
  "paciente": {
    "nombres": "JUAN",
    "apellido_paterno": "PÉREZ",
    "apellido_materno": "GARCÍA",
    "fecha_nacimiento": "2015-05-10",
    "tipo_documento_id": 1,
    "numero_documento": "87654321",
    "sexo_id": 1,
    "distrito_id": 10,
    "direccion": "Av. Principal 123",
    "celular": "987654321",
    "celular2": "987654322",
    "correo": "juan@example.com",
    "diagnostico_medico": "NINGUNO",
    "alergias": "NINGUNA",
    "medicamentos_actuales": "NINGUNO"
  },
  "servicio": {
    "servicio_id": 3,
    "motivo_consulta": "Terapia familiar",
    "referido_por": "Recomendación"
  },
  "responsables": [
    {
      "nombre": "MARÍA",
      "apellido_paterno": "GARCÍA",
      "apellido_materno": "LÓPEZ",
      "tipo_documento_id": 1,
      "numero_documento": "12345678",
      "relacion_id": 1,
      "telefono": "987654321",
      "email": "maria@example.com"
    },
    {
      "nombre": "PEDRO",
      "apellido_paterno": "PÉREZ",
      "apellido_materno": "RAMOS",
      "tipo_documento_id": 1,
      "numero_documento": "87654321",
      "relacion_id": 2,
      "telefono": "987654322",
      "email": "pedro@example.com"
    }
  ],
  "consentimientos": {
    "acepta_terminos": true,
    "acepta_info_comercial": false
  },
  "metadata": {
    "recaptchaToken": "token_aqui",
    "user_id": 0
  }
}
```

**Response:**

```json
{
  "paciente": {
    "id": 123,
    "nombres": "JUAN",
    "apellido_paterno": "PÉREZ",
    "created_at": "2025-01-21T10:00:00.000Z",
    ...
  }
}
```

---

### 2. Obtener Responsables de un Paciente

**Endpoint:** `GET /backend_api/pacientes/:pacienteId/responsables`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "paciente_id": 123,
      "nombres": "MARÍA",
      "apellido_paterno": "GARCÍA",
      "apellido_materno": "LÓPEZ",
      "tipo_documento": {
        "id": 1,
        "nombre": "DNI"
      },
      "numero_documento": "12345678",
      "responsable_relacion": {
        "id": 1,
        "nombre": "Madre"
      },
      "telefono": "987654321",
      "email": "maria@example.com",
      "orden": 1,
      "activo": true
    },
    {
      "id": 2,
      "paciente_id": 123,
      "nombres": "PEDRO",
      "apellido_paterno": "PÉREZ",
      "apellido_materno": "RAMOS",
      "tipo_documento": {
        "id": 1,
        "nombre": "DNI"
      },
      "numero_documento": "87654321",
      "responsable_relacion": {
        "id": 2,
        "nombre": "Padre"
      },
      "telefono": "987654322",
      "email": "pedro@example.com",
      "orden": 2,
      "activo": true
    }
  ]
}
```

---

### 3. Agregar Nuevo Responsable

**Endpoint:** `POST /backend_api/pacientes/:pacienteId/responsables`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "nombres": "CARLOS",
  "apellido_paterno": "LÓPEZ",
  "apellido_materno": "MARTÍNEZ",
  "tipo_documento_id": 1,
  "numero_documento": "11223344",
  "responsable_relacion_id": 5,
  "telefono": "987654323",
  "email": "carlos@example.com",
  "tiene_proceso_legal": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Responsable agregado correctamente",
  "data": {
    "id": 3,
    "paciente_id": 123,
    "nombres": "CARLOS",
    ...
  }
}
```

**⚠️ NOTA IMPORTANTE:** Si el paciente tiene datos legacy (responsable en columnas viejas), este endpoint automáticamente:
1. Migra el responsable viejo a la tabla `paciente_responsable`
2. Limpia las columnas viejas
3. Inserta el nuevo responsable

---

### 4. Actualizar Responsable

**Endpoint:** `PUT /backend_api/pacientes/:pacienteId/responsables/:responsableId`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "nombres": "MARÍA ELENA",
  "apellido_paterno": "GARCÍA",
  "apellido_materno": "LÓPEZ",
  "tipo_documento_id": 1,
  "numero_documento": "12345678",
  "responsable_relacion_id": 1,
  "telefono": "987654321",
  "email": "maria.elena@example.com",
  "tiene_proceso_legal": false
}
```

---

### 5. Eliminar Responsable

**Endpoint:** `DELETE /backend_api/pacientes/:pacienteId/responsables/:responsableId`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "message": "Responsable eliminado correctamente"
}
```

**Nota:** Es un **soft delete** (pone `activo = 0`), no borra físicamente el registro.

---

### 6. Reordenar Responsables

**Endpoint:** `POST /backend_api/pacientes/:pacienteId/responsables/reordenar`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "orden": [2, 1, 3]
}
```

Esto cambia el orden de los responsables según el array de IDs proporcionado.

---

## 🎨 Ejemplo de Uso en Frontend

### Crear Paciente con Múltiples Responsables

```javascript
const payload = {
  paciente: {
    nombres: formData.nombre,
    apellido_paterno: formData.apellidoPaterno,
    // ... demás campos
  },
  servicio: {
    servicio_id: formData.serviciosRequeridos,
    motivo_consulta: formData.motivoConsulta,
    referido_por: formData.referidoPor
  },
  // 🆕 Enviar array de responsables
  responsables: [
    {
      nombre: formData.responsable1Nombre,
      apellido_paterno: formData.responsable1ApellidoPaterno,
      apellido_materno: formData.responsable1ApellidoMaterno,
      tipo_documento_id: formData.responsable1TipoDocumento,
      numero_documento: formData.responsable1NumeroDocumento,
      relacion_id: formData.responsable1Relacion,
      telefono: formData.responsable1Telefono,
      email: formData.responsable1Email
    },
    {
      nombre: formData.responsable2Nombre,
      apellido_paterno: formData.responsable2ApellidoPaterno,
      // ... segundo responsable
    }
  ],
  consentimientos: {
    acepta_terminos: formData.aceptaTerminos,
    acepta_info_comercial: formData.autorizaInformacion
  },
  metadata: {
    recaptchaToken: captchaValue,
    user_id: 0
  }
};

const response = await createPaciente(payload);
```

---

## ✅ Ventajas del Sistema Implementado

1. ✅ **Compatibilidad Total** - Los pacientes antiguos siguen funcionando sin modificar
2. ✅ **Migración Automática** - No necesitas migrar datos manualmente
3. ✅ **Cero Pérdida de Datos** - Los datos legacy se mantienen hasta que sean migrados
4. ✅ **Transparente** - El usuario no nota la diferencia
5. ✅ **Múltiples Responsables** - Ahora puedes tener padre, madre, tutor, etc.
6. ✅ **Flexible** - Puedes agregar, editar, eliminar y reordenar responsables
7. ✅ **Auditable** - Todas las operaciones se registran en la auditoría

---

## 🔍 Casos de Uso

### Caso 1: Paciente Viejo que Necesita Otro Responsable

```
1. Paciente "Juan" registrado en 2024
   → Responsable: María (en columnas legacy)

2. La señora llama y pide agregar a Pedro como segundo responsable

3. Backend detecta:
   - Hay datos legacy (María)
   - Se solicita agregar otro responsable (Pedro)

4. Backend ejecuta:
   ✅ Migra a María → paciente_responsable (orden=1)
   ✅ Limpia columnas legacy
   ✅ Inserta a Pedro → paciente_responsable (orden=2)

5. Resultado:
   - María (orden=1, activo=1)
   - Pedro (orden=2, activo=1)
```

### Caso 2: Paciente Nuevo con 2 Responsables

```
1. Se registra un nuevo paciente "Ana"

2. Frontend envía array de responsables:
   - responsables[0]: Padre
   - responsables[1]: Madre

3. Backend:
   ✅ Crea paciente
   ✅ Inserta ambos responsables en paciente_responsable

4. Resultado:
   - Padre (orden=1, activo=1)
   - Madre (orden=2, activo=1)
```

---

## 📝 Notas Técnicas

- **Entidad:** `PacienteResponsable` (`src/pacientes/entities/paciente-responsable.entity.ts`)
- **Servicio:** `PacienteResponsableService` (`src/pacientes/services/paciente-responsable.service.ts`)
- **Controlador:** `PacienteResponsableController` (`src/pacientes/controllers/paciente-responsable.controller.ts`)
- **DTO:** `CreateResponsableDto` (`src/pacientes/dto/create-responsable.dto.ts`)

---

## 🚀 Siguientes Pasos Recomendados

1. **Frontend:** Actualizar el formulario de registro para permitir múltiples responsables
2. **Frontend:** Crear interfaz en el admin para gestionar responsables
3. **Testing:** Probar los casos de migración automática
4. **Opcional:** Crear un script para migrar TODOS los datos legacy de una vez

---

## 🐛 Troubleshooting

### Error: "Cannot find module PacienteResponsable"

**Solución:** Asegúrate de que el backend esté compilado:

```bash
cd C:\Users\Lucero\Desktop\centro-crecemos
npm run build
```

### Error: "Column 'orden' doesn't exist"

**Solución:** La tabla `paciente_responsable` no fue creada. Ejecuta el CREATE TABLE en MySQL.

### Los responsables legacy no aparecen

**Verificar:** El método `getResponsables()` debería devolver tanto datos de la tabla nueva como de las columnas viejas. Revisar logs del backend.

---

**Implementado por:** Claude Code
**Fecha:** 21 de Enero de 2026
**Versión:** 1.0.0
