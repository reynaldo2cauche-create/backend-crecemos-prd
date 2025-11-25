# Instrucciones para Ejecutar Migración RR.HH.

## Opción 1: Desde MySQL Workbench o phpMyAdmin

1. Abre MySQL Workbench o phpMyAdmin
2. Conecta a la base de datos `crecemos_website`
3. Abre el archivo `migration_rrhh_completa.sql`
4. Ejecuta el script completo

## Opción 2: Desde la terminal

Abre PowerShell o CMD y ejecuta:

```bash
mysql -u root -p crecemos_website < migration_rrhh_completa.sql
```

Cuando te pida la contraseña, ingresa: `admin`

## Opción 3: Ejecutar paso a paso en MySQL

Conecta a MySQL y ejecuta estos comandos uno por uno:

```sql
USE crecemos_website;

-- Agregar campos de RR.HH. a trabajador_centro
ALTER TABLE trabajador_centro
ADD COLUMN sueldo_base DECIMAL(10, 2) NULL COMMENT 'Sueldo base mensual del trabajador',
ADD COLUMN fecha_ingreso DATE NULL COMMENT 'Fecha de ingreso del trabajador',
ADD COLUMN numero_cuenta VARCHAR(50) NULL COMMENT 'Número de cuenta bancaria',
ADD COLUMN banco VARCHAR(100) NULL COMMENT 'Nombre del banco';

-- Crear tabla de pagos
CREATE TABLE pagos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trabajador_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL COMMENT 'gratificacion, bono, aguinaldo',
  monto DECIMAL(10, 2) NOT NULL,
  periodo VARCHAR(50) NOT NULL COMMENT 'julio-2024, diciembre-2024',
  fechaPago DATE NOT NULL,
  registradoPor VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trabajador_id) REFERENCES trabajador_centro(id) ON DELETE CASCADE,
  INDEX idx_trabajador_id (trabajador_id),
  INDEX idx_tipo (tipo),
  INDEX idx_periodo (periodo),
  INDEX idx_fechaPago (fechaPago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migración completada exitosamente' AS status;
```

## ¿Qué hace esta migración?

1. **Agrega 4 campos nuevos a `trabajador_centro`:**
   - `sueldo_base`: Sueldo mensual del empleado
   - `fecha_ingreso`: Fecha en que ingresó a trabajar
   - `numero_cuenta`: Número de cuenta bancaria
   - `banco`: Nombre del banco (BCP, Interbank, etc.)

2. **Crea la tabla `pagos`:**
   - Registra todos los pagos (gratificaciones, bonos, aguinaldos)
   - Relacionada con `trabajador_centro` mediante `trabajador_id`
   - Incluye índices para optimizar búsquedas

## Verificar que funcionó

Después de ejecutar la migración, verifica con:

```sql
DESCRIBE trabajador_centro;
DESCRIBE pagos;
```

Deberías ver los nuevos campos en `trabajador_centro` y la tabla `pagos` completa.
