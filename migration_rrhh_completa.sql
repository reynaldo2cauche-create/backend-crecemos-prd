-- ========================================
-- MIGRACIÓN COMPLETA MÓDULO DE RR.HH.
-- ========================================

-- 1. Agregar campos de RR.HH. a la tabla trabajador_centro
ALTER TABLE trabajador_centro
ADD COLUMN IF NOT EXISTS sueldo_base DECIMAL(10, 2) NULL COMMENT 'Sueldo base mensual del trabajador',
ADD COLUMN IF NOT EXISTS fecha_ingreso DATE NULL COMMENT 'Fecha de ingreso del trabajador',
ADD COLUMN IF NOT EXISTS numero_cuenta VARCHAR(50) NULL COMMENT 'Número de cuenta bancaria',
ADD COLUMN IF NOT EXISTS banco VARCHAR(100) NULL COMMENT 'Nombre del banco';

-- 2. Crear tabla de pagos
CREATE TABLE IF NOT EXISTS pagos (
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

-- 3. Verificación
SELECT 'Migración completada exitosamente' AS status;
