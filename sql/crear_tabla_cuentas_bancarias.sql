-- Tabla para almacenar múltiples cuentas bancarias por empleado
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trabajador_id INT NOT NULL,
  banco VARCHAR(100) NOT NULL,
  numero_cuenta VARCHAR(50) NOT NULL,
  cci VARCHAR(50),
  es_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trabajador_id) REFERENCES trabajador_centro(id) ON DELETE CASCADE,
  INDEX idx_trabajador (trabajador_id),
  INDEX idx_principal (trabajador_id, es_principal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar datos existentes de trabajador_centro a cuentas_bancarias
-- (Solo si existen datos en banco y numero_cuenta)
INSERT INTO cuentas_bancarias (trabajador_id, banco, numero_cuenta, es_principal)
SELECT id, banco, numero_cuenta, TRUE
FROM trabajador_centro
WHERE banco IS NOT NULL AND numero_cuenta IS NOT NULL AND banco != '' AND numero_cuenta != '';

-- OPCIONAL: Comentar estas líneas si aún necesitas los campos antiguos
-- ALTER TABLE trabajador_centro DROP COLUMN banco;
-- ALTER TABLE trabajador_centro DROP COLUMN numero_cuenta;
