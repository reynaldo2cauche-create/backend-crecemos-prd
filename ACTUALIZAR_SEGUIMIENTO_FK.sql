-- Agregar Foreign Keys a seguimiento_asistencia

-- 1. Agregar FK para recepcion_estado_id
ALTER TABLE `seguimiento_asistencia`
ADD CONSTRAINT `fk_seguimiento_recepcion_estado`
FOREIGN KEY (`recepcion_estado_id`)
REFERENCES `estado_cita`(`id`)
ON DELETE SET NULL;

-- 2. Agregar FK para terapeuta_estado_id
ALTER TABLE `seguimiento_asistencia`
ADD CONSTRAINT `fk_seguimiento_terapeuta_estado`
FOREIGN KEY (`terapeuta_estado_id`)
REFERENCES `estado_cita`(`id`)
ON DELETE SET NULL;

-- 3. Agregar FK para recepcion_usuario_id (opcional, si tienes tabla usuarios/trabajadores)
ALTER TABLE `seguimiento_asistencia`
ADD CONSTRAINT `fk_seguimiento_recepcion_usuario`
FOREIGN KEY (`recepcion_usuario_id`)
REFERENCES `trabajador_centro`(`id`)
ON DELETE SET NULL;

-- 4. Agregar FK para terapeuta_usuario_id (opcional)
ALTER TABLE `seguimiento_asistencia`
ADD CONSTRAINT `fk_seguimiento_terapeuta_usuario`
FOREIGN KEY (`terapeuta_usuario_id`)
REFERENCES `trabajador_centro`(`id`)
ON DELETE SET NULL;
