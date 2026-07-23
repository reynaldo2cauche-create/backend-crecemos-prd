-- Candado diario del reporte de agenda (correo 7 PM).
-- La PK sobre `fecha` garantiza un único registro por día: si dos instancias
-- del backend disparan el @Cron a la vez, solo una logra el INSERT y envía el
-- correo; la otra recibe ER_DUP_ENTRY y se omite.
--
-- Ejecutar UNA vez en la base de datos de producción (y en la local si se prueba).

CREATE TABLE IF NOT EXISTS reporte_agenda_envio (
  fecha DATE NOT NULL,
  enviado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
