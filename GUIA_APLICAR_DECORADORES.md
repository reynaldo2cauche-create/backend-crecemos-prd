# 🎯 Guía Rápida: Aplicar Decorador @Auditable

Esta guía te ayudará a aplicar el decorador `@Auditable()` en los controllers existentes del sistema.

---

## 📦 Paso 1: Importar el Decorador

En cada controller que quieras auditar, agrega este import al inicio del archivo:

```typescript
import { Auditable } from '../auditoria/decorators/auditable.decorator';
```

---

## 🎨 Paso 2: Aplicar el Decorador

### **PACIENTE CONTROLLER**

**Archivo**: `src/pacientes/paciente.controller.ts`

```typescript
@Get()
@Auditable({
  modulo: 'PACIENTES',
  accion: 'VER_LISTA_PACIENTES',
})
obtenerTodos() {
  return this.pacienteService.findAll();
}

@Get(':id')
@Auditable({
  modulo: 'PACIENTES',
  accion: 'VER_PACIENTE',
  entidadTipo: 'Paciente'
})
obtenerPorId(@Param('id') id: number) {
  return this.pacienteService.findOne(id);
}

@Post()
@Auditable({
  modulo: 'PACIENTES',
  accion: 'CREAR_PACIENTE',
  entidadTipo: 'Paciente'
})
crear(@Body() dto: CreatePacienteDto) {
  return this.pacienteService.create(dto);
}

@Put(':id')
@Auditable({
  modulo: 'PACIENTES',
  accion: 'EDITAR_PACIENTE',
  entidadTipo: 'Paciente'
})
actualizar(@Param('id') id: number, @Body() dto: UpdatePacienteDto) {
  return this.pacienteService.update(id, dto);
}

@Put(':id/estado')
@Auditable({
  modulo: 'PACIENTES',
  accion: 'CAMBIAR_ESTADO_PACIENTE',
  entidadTipo: 'Paciente'
})
cambiarEstado(@Param('id') id: number, @Body() dto: any) {
  return this.pacienteService.cambiarEstado(id, dto);
}
```

---

### **CITAS CONTROLLER**

**Archivo**: `src/citas/citas.controller.ts`

```typescript
@Get()
@Auditable({
  modulo: 'CITAS',
  accion: 'VER_AGENDA',
})
obtenerCitas(@Query() filtros: any) {
  return this.citasService.findAll(filtros);
}

@Post()
@Auditable({
  modulo: 'CITAS',
  accion: 'CREAR_CITA',
  entidadTipo: 'Cita'
})
crearCita(@Body() dto: CreateCitaDto) {
  return this.citasService.create(dto);
}

@Put(':id')
@Auditable({
  modulo: 'CITAS',
  accion: 'EDITAR_CITA',
  entidadTipo: 'Cita'
})
actualizarCita(@Param('id') id: number, @Body() dto: UpdateCitaDto) {
  return this.citasService.update(id, dto);
}

@Delete(':id')
@Auditable({
  modulo: 'CITAS',
  accion: 'ELIMINAR_CITA',
  entidadTipo: 'Cita'
})
eliminarCita(@Param('id') id: number) {
  return this.citasService.remove(id);
}
```

---

### **HISTORIA CLÍNICA CONTROLLER**

**Archivo**: `src/historia-clinica/historia-clinica.controller.ts`

```typescript
@Get('paciente/:pacienteId')
@Auditable({
  modulo: 'PACIENTES',
  accion: 'VER_HISTORIA_CLINICA',
  entidadTipo: 'Paciente'
})
obtenerHistoriaClinica(@Param('pacienteId') pacienteId: number) {
  return this.historiaService.findByPaciente(pacienteId);
}

@Put(':id')
@Auditable({
  modulo: 'PACIENTES',
  accion: 'EDITAR_HISTORIA_CLINICA',
  entidadTipo: 'HistoriaClinica'
})
actualizarHistoria(@Param('id') id: number, @Body() dto: any) {
  return this.historiaService.update(id, dto);
}

@Post('archivo-digital')
@Auditable({
  modulo: 'ARCHIVOS',
  accion: 'SUBIR_ARCHIVO_DIGITAL',
  entidadTipo: 'ArchivoDigital'
})
subirArchivo(@Body() dto: any) {
  return this.historiaService.subirArchivo(dto);
}

@Get('archivo/:id/descargar')
@Auditable({
  modulo: 'ARCHIVOS',
  accion: 'DESCARGAR_ARCHIVO',
  entidadTipo: 'ArchivoDigital'
})
descargarArchivo(@Param('id') id: number) {
  return this.historiaService.descargarArchivo(id);
}

@Delete('archivo/:id')
@Auditable({
  modulo: 'ARCHIVOS',
  accion: 'ELIMINAR_ARCHIVO',
  entidadTipo: 'ArchivoDigital'
})
eliminarArchivo(@Param('id') id: number) {
  return this.historiaService.eliminarArchivo(id);
}
```

---

### **ARCHIVOS OFICIALES CONTROLLER**

**Archivo**: `src/historia-clinica/archivos-oficiales.controller.ts` (o similar)

```typescript
@Get()
@Auditable({
  modulo: 'ARCHIVOS',
  accion: 'VER_LISTA_CERTIFICADOS',
})
obtenerCertificados(@Query() filtros: any) {
  return this.archivosService.findAll(filtros);
}

@Get(':id')
@Auditable({
  modulo: 'ARCHIVOS',
  accion: 'VER_CERTIFICADO',
  entidadTipo: 'ArchivoOficial'
})
obtenerCertificado(@Param('id') id: number) {
  return this.archivosService.findOne(id);
}

@Post()
@Auditable({
  modulo: 'ARCHIVOS',
  accion: 'CREAR_CERTIFICADO',
  entidadTipo: 'ArchivoOficial'
})
crearCertificado(@Body() dto: any) {
  return this.archivosService.create(dto);
}
```

---

### **TRABAJADOR CENTRO CONTROLLER (RRHH)**

**Archivo**: `src/usuarios/trabajador-centro.controller.ts`

```typescript
@Get()
@Auditable({
  modulo: 'RRHH',
  accion: 'VER_LISTA_EMPLEADOS',
})
obtenerEmpleados() {
  return this.trabajadorService.findAll();
}

@Get(':id')
@Auditable({
  modulo: 'RRHH',
  accion: 'VER_EMPLEADO',
  entidadTipo: 'TrabajadorCentro'
})
obtenerEmpleado(@Param('id') id: number) {
  return this.trabajadorService.findOne(id);
}

@Post()
@Auditable({
  modulo: 'RRHH',
  accion: 'CREAR_EMPLEADO',
  entidadTipo: 'TrabajadorCentro'
})
crearEmpleado(@Body() dto: CreateTrabajadorDto) {
  return this.trabajadorService.create(dto);
}

@Put(':id')
@Auditable({
  modulo: 'RRHH',
  accion: 'EDITAR_EMPLEADO',
  entidadTipo: 'TrabajadorCentro'
})
actualizarEmpleado(@Param('id') id: number, @Body() dto: UpdateTrabajadorDto) {
  return this.trabajadorService.update(id, dto);
}

@Delete(':id')
@Auditable({
  modulo: 'RRHH',
  accion: 'ELIMINAR_EMPLEADO',
  entidadTipo: 'TrabajadorCentro'
})
eliminarEmpleado(@Param('id') id: number) {
  return this.trabajadorService.remove(id);
}
```

---

### **RRHH CONTROLLER (Pagos, Gratificaciones, Vacaciones)**

**Archivo**: `src/rrhh/rrhh.controller.ts`

```typescript
@Post('pago')
@Auditable({
  modulo: 'RRHH',
  accion: 'REGISTRAR_PAGO',
  entidadTipo: 'Pago'
})
registrarPago(@Body() dto: CreatePagoDto) {
  return this.rrhhService.registrarPago(dto);
}

@Post('gratificacion')
@Auditable({
  modulo: 'RRHH',
  accion: 'CALCULAR_GRATIFICACION',
  entidadTipo: 'Pago'
})
calcularGratificacion(@Body() dto: any) {
  return this.rrhhService.calcularGratificacion(dto);
}

@Post('vacacion')
@Auditable({
  modulo: 'RRHH',
  accion: 'REGISTRAR_VACACION',
  entidadTipo: 'Vacacion'
})
registrarVacacion(@Body() dto: CreateVacacionDto) {
  return this.rrhhService.registrarVacacion(dto);
}

@Get('historial-pagos')
@Auditable({
  modulo: 'RRHH',
  accion: 'VER_HISTORIAL_PAGOS',
})
obtenerHistorialPagos(@Query() filtros: any) {
  return this.rrhhService.obtenerHistorial(filtros);
}

@Get('dashboard')
@Auditable({
  modulo: 'RRHH',
  accion: 'VER_DASHBOARD',
})
obtenerDashboard() {
  return this.rrhhService.getDashboard();
}
```

---

### **POSTULACIONES CONTROLLER**

**Archivo**: `src/postulaciones/postulaciones.controller.ts`

```typescript
@Get()
@Auditable({
  modulo: 'POSTULACIONES',
  accion: 'VER_LISTA_POSTULACIONES',
})
obtenerPostulaciones(@Query() filtros: any) {
  return this.postulacionesService.findAll(filtros);
}

@Get(':id')
@Auditable({
  modulo: 'POSTULACIONES',
  accion: 'VER_POSTULACION',
  entidadTipo: 'Postulacion'
})
obtenerPostulacion(@Param('id') id: number) {
  return this.postulacionesService.findOne(id);
}

@Put(':id/estado')
@Auditable({
  modulo: 'POSTULACIONES',
  accion: 'CAMBIAR_ESTADO_POSTULACION',
  entidadTipo: 'Postulacion'
})
cambiarEstado(@Param('id') id: number, @Body() dto: any) {
  return this.postulacionesService.cambiarEstado(id, dto);
}

@Post(':id/comentario')
@Auditable({
  modulo: 'POSTULACIONES',
  accion: 'AGREGAR_COMENTARIO',
  entidadTipo: 'Postulacion'
})
agregarComentario(@Param('id') id: number, @Body() dto: any) {
  return this.postulacionesService.agregarComentario(id, dto);
}
```

---

### **AUTH CONTROLLER (Login/Logout)**

**Archivo**: `src/auth/auth.controller.ts`

```typescript
// NOTA: Para login, mejor hacerlo en el servicio directamente
// porque el interceptor requiere usuario autenticado

// En auth.service.ts, después de un login exitoso:
async login(dto: LoginDto) {
  // ... validaciones

  // Actualizar último acceso
  await this.trabajadorRepository.update(user.id, {
    ultimo_acceso: new Date()
  });

  // Registrar login manualmente (opcional)
  // porque el interceptor solo funciona con endpoints decorados

  return {
    access_token: token,
    user: userData
  };
}
```

---

### **EVALUACIONES CONTROLLER**

**Archivo**: `src/evaluaciones/evaluaciones.controller.ts`

```typescript
@Get()
@Auditable({
  modulo: 'REPORTES',
  accion: 'VER_EVALUACIONES',
})
obtenerEvaluaciones(@Query() filtros: any) {
  return this.evaluacionesService.findAll(filtros);
}

@Post()
@Auditable({
  modulo: 'REPORTES',
  accion: 'GUARDAR_EVALUACION',
  entidadTipo: 'ResultadosTest'
})
guardarEvaluacion(@Body() dto: any) {
  return this.evaluacionesService.guardar(dto);
}

@Get('exportar')
@Auditable({
  modulo: 'REPORTES',
  accion: 'EXPORTAR_EVALUACIONES',
})
exportarEvaluaciones(@Query() filtros: any) {
  return this.evaluacionesService.exportar(filtros);
}
```

---

## 🎯 Módulos Disponibles

Usa estos nombres para el campo `modulo`:

- `PACIENTES`
- `CITAS`
- `ARCHIVOS`
- `RRHH`
- `POSTULACIONES`
- `REPORTES`
- `AUDITORIA`
- `AUTH`

## 📝 Acciones Comunes

Usa estos nombres para el campo `accion`:

- `VER_LISTA_*`
- `VER_*`
- `CREAR_*`
- `EDITAR_*`
- `ELIMINAR_*`
- `CAMBIAR_ESTADO_*`
- `EXPORTAR_*`
- `DESCARGAR_*`
- `SUBIR_*`
- `REGISTRAR_*`
- `CALCULAR_*`

## 🏷️ Tipos de Entidad

Usa estos nombres para el campo `entidadTipo`:

- `Paciente`
- `Cita`
- `HistoriaClinica`
- `ArchivoDigital`
- `ArchivoOficial`
- `TrabajadorCentro`
- `Pago`
- `Vacacion`
- `Postulacion`
- `ResultadosTest`

---

## ✅ Checklist de Implementación

- [ ] Importar decorador en cada controller
- [ ] Aplicar en endpoints GET (lecturas)
- [ ] Aplicar en endpoints POST (creaciones)
- [ ] Aplicar en endpoints PUT/PATCH (ediciones)
- [ ] Aplicar en endpoints DELETE (eliminaciones)
- [ ] Probar que se registren en la base de datos
- [ ] Verificar en página de auditoría

---

## 🧪 Cómo Probar

1. Aplica el decorador en un endpoint
2. Reinicia el backend: `npm run start:dev`
3. Desde el frontend, ejecuta la acción (ej: ver un paciente)
4. Ve a `/intranet/auditoria` en el frontend
5. Deberías ver el registro de la acción

O consulta directamente en MySQL:

```sql
SELECT * FROM auditoria_acciones ORDER BY fecha_hora DESC LIMIT 10;
```

---

## ⚠️ Notas Importantes

1. **El decorador solo funciona con usuarios autenticados**
   - Si el endpoint no tiene JWT, no se audita
   - Asegúrate de tener `@UseGuards(JwtAuthGuard)`

2. **El decorador es opcional**
   - No es obligatorio en todos los endpoints
   - Úsalo solo en acciones importantes

3. **El registro es asíncrono**
   - No afecta el performance
   - Si hay error en auditoría, no afecta la operación principal

4. **Nombres descriptivos**
   - Usa nombres claros y consistentes
   - Facilita búsquedas y análisis

---

## 🎓 Recursos

- Documentación completa: `SISTEMA_AUDITORIA_README.md`
- Código del decorador: `src/auditoria/decorators/auditable.decorator.ts`
- Código del interceptor: `src/auditoria/auditoria.interceptor.ts`

---

¡Listo para auditar! 🚀
