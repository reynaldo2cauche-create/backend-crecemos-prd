import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeguimientoAsistencia } from './entities/seguimiento-asistencia.entity';
import { Cita } from './entities/cita.entity';
import { RegistrarRecepcionDto, RegistrarTerapeutaDto } from './dto/registrar-asistencia.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class AsistenciaService {
  constructor(
    @InjectRepository(SeguimientoAsistencia)
    private seguimientoRepo: Repository<SeguimientoAsistencia>,
    @InjectRepository(Cita)
    private citaRepo: Repository<Cita>,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
  ) {}

  /**
   * Obtener seguimiento de asistencia de una cita
   */
  async obtenerSeguimiento(cita_id: number): Promise<SeguimientoAsistencia | null> {
    const seguimiento = await this.seguimientoRepo.findOne({
      where: { cita_id },
    });

    return seguimiento;
  }

  /**
   * Registrar llegada del paciente (RECEPCIÓN)
   */
 async registrarRecepcion(dto: RegistrarRecepcionDto): Promise<any> {
  console.log(`📝 Registrando recepción - Cita ID: ${dto.cita_id}, Estado: ${dto.estado_id}`);

  // Verificar que la cita existe
  const cita = await this.citaRepo.findOne({ where: { id: dto.cita_id } });
  if (!cita) {
    throw new NotFoundException('Cita no encontrada');
  }

  // Validar estado_id: solo 7, 6 o null (desmarcar)
  if (dto.estado_id !== null && ![7, 6].includes(dto.estado_id)) {
    throw new BadRequestException('Estado inválido para recepción');
  }

  // Buscar o crear seguimiento
  let seguimiento = await this.seguimientoRepo.findOne({
    where: { cita_id: dto.cita_id },
  });

  if (!seguimiento) {
    seguimiento = this.seguimientoRepo.create({
      cita_id: dto.cita_id,
    });
  }

  if (dto.estado_id === null) {
    // DESMARCAR: limpiar el registro de recepción
    seguimiento.recepcion_marco = 0;
    seguimiento.recepcion_estado_id = null;
    seguimiento.recepcion_fecha = null;
    seguimiento.recepcion_usuario_id = null;

    await this.seguimientoRepo.save(seguimiento);

    // Revertir estado de la cita a pendiente (estado 1) si terapeuta tampoco marcó
    if (!seguimiento.terapeuta_marco) {
      cita.estado_id = 1;
      await this.citaRepo.save(cita);
    }

    console.log(`🔄 Recepción desmarcada - Cita ID: ${dto.cita_id}`);
    return { success: true, message: 'Marca de recepción eliminada', seguimiento };
  }

  // MARCAR / CAMBIAR: permite actualizar aunque ya estuviera registrado
  seguimiento.recepcion_marco = 1;
  seguimiento.recepcion_usuario_id = dto.usuario_id;
  seguimiento.recepcion_estado_id = dto.estado_id;
  seguimiento.recepcion_fecha = new Date();

  await this.seguimientoRepo.save(seguimiento);

  // Actualizar estado de la cita
  cita.estado_id = dto.estado_id;
  await this.citaRepo.save(cita);

  console.log(`✅ Recepción registrada/actualizada - Estado: ${dto.estado_id}`);

  // VERIFICAR INCONSISTENCIA SOLO SI AMBOS YA MARCARON Y TIENEN ESTADOS DIFERENTES
  await this.verificarYNotificarInconsistencia(seguimiento, dto.cita_id);

  return {
    success: true,
    message: dto.estado_id === 7 ? 'Llegada confirmada' : 'Sesión dictada registrada',
    seguimiento,
  };
}

  /**
   * Registrar sesión completada (TERAPEUTA)
   */
 async registrarTerapeuta(dto: RegistrarTerapeutaDto): Promise<any> {
  console.log(`📝 Registrando terapeuta - Cita ID: ${dto.cita_id}, Estado: ${dto.estado_id}`);

  // Verificar que la cita existe
  const cita = await this.citaRepo.findOne({ where: { id: dto.cita_id } });
  if (!cita) {
    throw new NotFoundException('Cita no encontrada');
  }

  // Validar estado_id: solo 7, 6 o null (desmarcar)
  if (dto.estado_id !== null && ![7, 6].includes(dto.estado_id)) {
    throw new BadRequestException('Estado inválido para terapeuta');
  }

  // Buscar o crear seguimiento
  let seguimiento = await this.seguimientoRepo.findOne({
    where: { cita_id: dto.cita_id },
  });

  if (!seguimiento) {
    seguimiento = this.seguimientoRepo.create({
      cita_id: dto.cita_id,
    });
  }

  if (dto.estado_id === null) {
    // DESMARCAR: limpiar el registro de terapeuta
    seguimiento.terapeuta_marco = 0;
    seguimiento.terapeuta_estado_id = null;
    seguimiento.terapeuta_fecha = null;
    seguimiento.terapeuta_usuario_id = null;

    await this.seguimientoRepo.save(seguimiento);

    // Revertir estado de la cita a pendiente (estado 1) si recepción tampoco marcó
    if (!seguimiento.recepcion_marco) {
      cita.estado_id = 1;
      await this.citaRepo.save(cita);
    }

    console.log(`🔄 Terapeuta desmarcado - Cita ID: ${dto.cita_id}`);
    return { success: true, message: 'Marca de terapeuta eliminada', seguimiento };
  }

  // MARCAR / CAMBIAR: permite actualizar aunque ya estuviera registrado
  seguimiento.terapeuta_marco = 1;
  seguimiento.terapeuta_usuario_id = dto.terapeuta_id;
  seguimiento.terapeuta_estado_id = dto.estado_id;
  seguimiento.terapeuta_fecha = new Date();

  await this.seguimientoRepo.save(seguimiento);

  // Actualizar estado de la cita
  if (seguimiento.recepcion_marco === 1) {
    // Si recepción ya marcó, verificar concordancia
    if (seguimiento.recepcion_estado_id === 7 && dto.estado_id === 7) {
      cita.estado_id = 7;
    } else if (dto.estado_id === 6) {
      cita.estado_id = 6;
    }
    await this.citaRepo.save(cita);
  } else {
    // Si recepción no ha marcado, actualizar directamente
    cita.estado_id = dto.estado_id;
    await this.citaRepo.save(cita);
  }

  console.log(`✅ Terapeuta registrado/actualizado - Estado: ${dto.estado_id}`);

  // VERIFICAR INCONSISTENCIA SOLO SI AMBOS YA MARCARON Y TIENEN ESTADOS DIFERENTES
  await this.verificarYNotificarInconsistencia(seguimiento, dto.cita_id);

  return {
    success: true,
    message: 'Sesión registrada correctamente',
    seguimiento,
  };
}
  /**
   * Obtener asistencias por terapeuta en un rango de fechas
   */
  async obtenerAsistenciasPorTerapeuta(
    terapeutaId: number,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<any> {
    console.log(`📊 Consultando asistencias del terapeuta ${terapeutaId} desde ${fechaInicio} hasta ${fechaFin}`);

    try {
      const query = `
        SELECT
          sa.id,
          sa.cita_id,
          CONCAT(c.fecha, ' ', c.hora_inicio) AS fecha_cita,
          CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', p.apellido_materno) AS paciente_nombre,
          sa.recepcion_marco,
          sa.recepcion_estado_id,
          sa.recepcion_fecha,
          sa.terapeuta_marco,
          sa.terapeuta_estado_id,
          sa.terapeuta_fecha
        FROM seguimiento_asistencia sa
        INNER JOIN citas c ON sa.cita_id = c.id
        INNER JOIN paciente p ON c.paciente_id = p.id
        WHERE c.doctor_id = ?
          AND c.fecha BETWEEN ? AND ?
          AND c.flg_activo = 1
        ORDER BY c.fecha DESC, c.hora_inicio DESC
      `;

      const asistencias = await this.seguimientoRepo.query(query, [terapeutaId, fechaInicio, fechaFin]);

      console.log(`✅ Encontradas ${asistencias.length} asistencias del terapeuta ${terapeutaId}`);

      return {
        asistencias,
        total: asistencias.length,
      };
    } catch (error) {
      console.error('❌ Error en obtenerAsistenciasPorTerapeuta:', error);
      throw error;
    }
  }

  /**
   * Obtener asistencias por paciente en un rango de fechas
   */
  async obtenerAsistenciasPorPaciente(
    pacienteId: number,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<any> {
    console.log(`📊 Consultando asistencias del paciente ${pacienteId} desde ${fechaInicio} hasta ${fechaFin}`);

    try {
      const query = `
        SELECT
          sa.id,
          sa.cita_id,
          CONCAT(c.fecha, ' ', c.hora_inicio) AS fecha_cita,
          CONCAT(tc.nombres, ' ', tc.apellidos) AS terapeuta_nombre,
          sa.recepcion_marco,
          sa.recepcion_estado_id,
          sa.recepcion_fecha,
          sa.terapeuta_marco,
          sa.terapeuta_estado_id,
          sa.terapeuta_fecha
        FROM seguimiento_asistencia sa
        INNER JOIN citas c ON sa.cita_id = c.id
        INNER JOIN trabajador_centro tc ON c.doctor_id = tc.id
        WHERE c.paciente_id = ?
          AND c.fecha BETWEEN ? AND ?
          AND c.flg_activo = 1
        ORDER BY c.fecha DESC, c.hora_inicio DESC
      `;

      const asistencias = await this.seguimientoRepo.query(query, [pacienteId, fechaInicio, fechaFin]);

      console.log(`✅ Encontradas ${asistencias.length} asistencias del paciente ${pacienteId}`);

      return {
        asistencias,
        total: asistencias.length,
      };
    } catch (error) {
      console.error('❌ Error en obtenerAsistenciasPorPaciente:', error);
      throw error;
    }
  }

  /**
   * Obtener inconsistencias de asistencia en un rango de fechas
   * LÓGICA:
   * - Para citas en el rango de fechas especificado
   * - Validar después de las 9pm del día de la cita (21:00)
   * - Detectar:
   *   1. Ninguno marcó (después de las 9pm del día de la cita o citas de días anteriores)
   *   2. Solo uno marcó (falta el otro)
   *   3. Ambos marcaron pero estados diferentes (6 vs 7)
   */
  async obtenerInconsistencias(fechaInicio: string, fechaFin: string): Promise<any> {
    console.log(`⚠️ Buscando inconsistencias desde ${fechaInicio} hasta ${fechaFin}`);

    try {
      const query = `
        SELECT
          COALESCE(sa.id, c.id) as id,
          c.id as cita_id,
          c.estado_id as cita_estado_id,
          CONCAT(c.fecha, ' ', c.hora_inicio) AS fecha_cita,
          CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', p.apellido_materno) AS paciente_nombre,
          CONCAT(tc.nombres, ' ', tc.apellidos) AS terapeuta_nombre,
          COALESCE(sa.recepcion_marco, 0) as recepcion_marco,
          sa.recepcion_estado_id,
          sa.recepcion_fecha,
          COALESCE(sa.terapeuta_marco, 0) as terapeuta_marco,
          sa.terapeuta_estado_id,
          sa.terapeuta_fecha,
          TIMESTAMPDIFF(HOUR, CONCAT(c.fecha, ' ', c.hora_inicio), NOW()) as horas_transcurridas,
          -- Determinar el tipo de inconsistencia
          CASE
            -- Caso 1: Ninguno marcó Y ya pasaron las 9pm del día de la cita (o la cita fue en días anteriores)
            WHEN (COALESCE(sa.recepcion_marco, 0) = 0
                  AND COALESCE(sa.terapeuta_marco, 0) = 0
                  AND (c.fecha < CURDATE() OR (c.fecha = CURDATE() AND CURTIME() >= '21:00:00')))
            THEN 'Ninguno marcó asistencia'

            -- Caso 2: Solo terapeuta marcó (6 o 7), falta recepción
            WHEN (COALESCE(sa.recepcion_marco, 0) = 0
                  AND COALESCE(sa.terapeuta_marco, 0) = 1
                  AND sa.terapeuta_estado_id IN (6, 7))
            THEN 'Falta registro de admisión'

            -- Caso 3: Solo recepción marcó (6 o 7), falta terapeuta
            WHEN (COALESCE(sa.recepcion_marco, 0) = 1
                  AND COALESCE(sa.terapeuta_marco, 0) = 0
                  AND sa.recepcion_estado_id IN (6, 7))
            THEN 'Falta registro del terapeuta'

            -- Caso 4: Ambos marcaron pero con estados DIFERENTES (6 vs 7)
            WHEN (COALESCE(sa.recepcion_marco, 0) = 1
                  AND COALESCE(sa.terapeuta_marco, 0) = 1
                  AND sa.recepcion_estado_id IN (6, 7)
                  AND sa.terapeuta_estado_id IN (6, 7)
                  AND sa.recepcion_estado_id != sa.terapeuta_estado_id)
            THEN CONCAT('Estados no coinciden (Admisión: ',
                       CASE WHEN sa.recepcion_estado_id = 7 THEN 'Asistió'
                            WHEN sa.recepcion_estado_id = 6 THEN 'Sesión Dictada'
                            ELSE 'Desconocido' END,
                       ', Terapeuta: ',
                       CASE WHEN sa.terapeuta_estado_id = 7 THEN 'Asistió'
                            WHEN sa.terapeuta_estado_id = 6 THEN 'Sesión Dictada'
                            ELSE 'Desconocido' END,
                       ')')
            ELSE NULL
          END as tipo_inconsistencia
        FROM citas c
        LEFT JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
        INNER JOIN paciente p ON c.paciente_id = p.id
        INNER JOIN trabajador_centro tc ON c.doctor_id = tc.id
        WHERE c.fecha BETWEEN ? AND ?
          AND c.flg_activo = 1
          AND c.estado_id NOT IN (5, 8)
        HAVING tipo_inconsistencia IS NOT NULL
        ORDER BY c.fecha DESC, c.hora_inicio DESC
      `;

      const inconsistencias = await this.seguimientoRepo.query(query, [fechaInicio, fechaFin]);

      console.log(`✅ Encontradas ${inconsistencias.length} inconsistencias`);

      return {
        inconsistencias,
        total: inconsistencias.length,
      };
    } catch (error) {
      console.error('❌ Error en obtenerInconsistencias:', error instanceof Error ? error.message : String(error));
      console.error('Stack:', error instanceof Error ? error.stack : '');
      throw error;
    }
  }

  /**
   * Obtener todas las asistencias para administrador
   */
  async obtenerTodasAsistencias(fechaInicio: string, fechaFin: string): Promise<any> {
    console.log(`📊 Admin consultando todas las asistencias desde ${fechaInicio} hasta ${fechaFin}`);

    try {
      const query = `
        SELECT
          sa.id,
          sa.cita_id,
          CONCAT(c.fecha, ' ', c.hora_inicio) AS fecha_cita,
          c.fecha as fecha_orden,
          CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', p.apellido_materno) AS paciente_nombre,
          CONCAT(tc.nombres, ' ', tc.apellidos) AS terapeuta_nombre,
          sa.recepcion_marco,
          sa.recepcion_estado_id,
          sa.recepcion_fecha,
          sa.terapeuta_marco,
          sa.terapeuta_estado_id,
          sa.terapeuta_fecha
        FROM seguimiento_asistencia sa
        INNER JOIN citas c ON sa.cita_id = c.id
        INNER JOIN paciente p ON c.paciente_id = p.id
        INNER JOIN trabajador_centro tc ON c.doctor_id = tc.id
        WHERE c.fecha BETWEEN ? AND ?
          AND c.flg_activo = 1
        ORDER BY c.fecha DESC, c.hora_inicio DESC
      `;

      const asistencias = await this.seguimientoRepo.query(query, [fechaInicio, fechaFin]);

      console.log(`✅ Encontradas ${asistencias.length} asistencias`);

      return {
        asistencias,
        total: asistencias.length,
      };
    } catch (error) {
      console.error('❌ Error en obtenerTodasAsistencias:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Verificar inconsistencias por falta de marcado (ejecutado automáticamente)
   * Revisa citas que ya pasaron las 9pm del día de la cita (21:00) y aún no han sido marcadas
   */
  async verificarInconsistenciasPorTiempo(): Promise<void> {
    console.log('🔍 Verificando inconsistencias de asistencia por tiempo...');

    try {
      // Buscar citas que cumplan con:
      // 1. Fecha + 24 horas ya pasó
      // 2. Ninguno marcó O solo uno marcó
      const query = `
        SELECT
          c.id as cita_id,
          CONCAT(c.fecha, ' ', c.hora_inicio) AS fecha_cita,
          c.fecha,
          c.hora_inicio,
          CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', p.apellido_materno) AS paciente_nombre,
          CONCAT(tc.nombres, ' ', tc.apellidos) AS terapeuta_nombre,
          sa.recepcion_marco,
          sa.recepcion_estado_id,
          sa.terapeuta_marco,
          sa.terapeuta_estado_id,
          sa.id as seguimiento_id
        FROM citas c
        LEFT JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
        INNER JOIN paciente p ON c.paciente_id = p.id
        INNER JOIN trabajador_centro tc ON c.doctor_id = tc.id
        WHERE (c.fecha < CURDATE() OR (c.fecha = CURDATE() AND CURTIME() >= '21:00:00'))
          AND c.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          AND (
            sa.id IS NULL OR
            sa.recepcion_marco = 0 OR
            sa.terapeuta_marco = 0
          )
      `;

      const citasPendientes = await this.seguimientoRepo.query(query);

      console.log(`📋 Encontradas ${citasPendientes.length} citas con posibles inconsistencias por tiempo`);

      for (const cita of citasPendientes) {
        // Verificar si ya se notificó esta inconsistencia antes
        const yaNotificado = await this.verificarSiYaSeNotifico(cita.cita_id);

        if (yaNotificado) {
          console.log(`⏭️ Cita ${cita.cita_id} ya tiene notificación, saltando...`);
          continue;
        }

        const recepcionMarco = cita.recepcion_marco === 1;
        const terapeutaMarco = cita.terapeuta_marco === 1;

        // Generar notificación
        try {
          await this.notificacionesService.notificarInconsistenciaAsistencia(
            cita.cita_id,
            cita.paciente_nombre,
            cita.terapeuta_nombre,
            cita.fecha,
            cita.hora_inicio,
            cita.recepcion_estado_id || null,
            cita.terapeuta_estado_id || null,
            recepcionMarco,
            terapeutaMarco,
          );

          console.log(`🚨 Notificación creada para cita ${cita.cita_id} (${cita.paciente_nombre})`);
        } catch (error) {
          console.error(`❌ Error al notificar cita ${cita.cita_id}:`, error instanceof Error ? error.message : String(error));
        }
      }

      console.log(`✅ Verificación de inconsistencias por tiempo completada`);
    } catch (error) {
      console.error('❌ Error en verificarInconsistenciasPorTiempo:', error);
      throw error;
    }
  }

  /**
   * Verifica si ya existe una notificación de inconsistencia para esta cita
   */
  private async verificarSiYaSeNotifico(citaId: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM eventos_sistema e
        INNER JOIN notificaciones n ON n.evento_id = e.id
        WHERE e.tipo_evento = 'INCONSISTENCIA_ASISTENCIA'
          AND JSON_EXTRACT(e.datos_adicionales, '$.cita_id') = ?
      `;

      const result = await this.seguimientoRepo.query(query, [citaId]);
      return parseInt(result[0].total) > 0;
    } catch (error) {
      console.error('Error al verificar notificación existente:', error);
      return false;
    }
  }

  /**
   * Modificar asistencia (SOLO ADMINISTRADOR)
   */
  async modificarAsistenciaAdmin(citaId: number, dto: { recepcion_estado_id?: number; terapeuta_estado_id?: number; admin_usuario_id: number }): Promise<any> {
    console.log(`🔧 Admin modificando asistencia de cita ${citaId}`);

    try {
      // Verificar que la cita existe
      const cita = await this.citaRepo.findOne({ where: { id: citaId } });
      if (!cita) {
        throw new NotFoundException('Cita no encontrada');
      }

      // Buscar o crear seguimiento
      let seguimiento = await this.seguimientoRepo.findOne({
        where: { cita_id: citaId },
      });

      if (!seguimiento) {
        seguimiento = this.seguimientoRepo.create({
          cita_id: citaId,
        });
      }

      // Modificar estado de recepción si se proporciona (null = desmarcar)
      if (dto.recepcion_estado_id !== undefined) {
        if (dto.recepcion_estado_id === null) {
          // DESMARCAR recepción
          seguimiento.recepcion_marco = 0;
          seguimiento.recepcion_estado_id = null;
          seguimiento.recepcion_fecha = null;
          seguimiento.recepcion_usuario_id = null;
        } else {
          if (![7, 6].includes(dto.recepcion_estado_id)) {
            throw new BadRequestException('Estado de recepción inválido');
          }
          seguimiento.recepcion_marco = 1;
          seguimiento.recepcion_estado_id = dto.recepcion_estado_id;
          seguimiento.recepcion_fecha = new Date();
          seguimiento.recepcion_usuario_id = dto.admin_usuario_id;
        }
      }

      // Modificar estado de terapeuta si se proporciona (null = desmarcar)
      if (dto.terapeuta_estado_id !== undefined) {
        if (dto.terapeuta_estado_id === null) {
          // DESMARCAR terapeuta
          seguimiento.terapeuta_marco = 0;
          seguimiento.terapeuta_estado_id = null;
          seguimiento.terapeuta_fecha = null;
          seguimiento.terapeuta_usuario_id = null;
        } else {
          if (![7, 6].includes(dto.terapeuta_estado_id)) {
            throw new BadRequestException('Estado de terapeuta inválido');
          }
          seguimiento.terapeuta_marco = 1;
          seguimiento.terapeuta_estado_id = dto.terapeuta_estado_id;
          seguimiento.terapeuta_fecha = new Date();
          seguimiento.terapeuta_usuario_id = dto.admin_usuario_id;
        }
      }

      await this.seguimientoRepo.save(seguimiento);

      // Actualizar estado de la cita según lo que quedó en seguimiento
      if (seguimiento.recepcion_marco === 1 && seguimiento.terapeuta_marco === 1) {
        if (seguimiento.recepcion_estado_id === 7 && seguimiento.terapeuta_estado_id === 7) {
          cita.estado_id = 7; // Asistió
        } else if (seguimiento.recepcion_estado_id === 6 || seguimiento.terapeuta_estado_id === 6) {
          cita.estado_id = 6; // Sesión Dictada
        }
      } else if (seguimiento.recepcion_marco === 1) {
        cita.estado_id = seguimiento.recepcion_estado_id;
      } else if (seguimiento.terapeuta_marco === 1) {
        cita.estado_id = seguimiento.terapeuta_estado_id;
      } else {
        // Ninguno marcó → pendiente
        cita.estado_id = 1;
      }

      await this.citaRepo.save(cita);

      console.log(`✅ Admin modificó asistencia de cita ${citaId}`);

      return {
        success: true,
        message: 'Asistencia modificada correctamente por administrador',
        seguimiento,
      };
    } catch (error) {
      console.error('❌ Error en modificarAsistenciaAdmin:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }


  /**
   * ✅ MÉTODO MEJORADO: Verifica y notifica SOLO cuando hay inconsistencia real
   * Se ejecuta cuando admisión o terapeuta registran asistencia
   * 
   * SOLO genera notificación si:
   * 1. AMBOS ya marcaron (recepcion_marco=1 Y terapeuta_marco=1)
   * 2. Y tienen ESTADOS DIFERENTES (uno marcó 7, otro marcó 6)
   */
  private async verificarYNotificarInconsistencia(seguimiento: SeguimientoAsistencia, citaId: number): Promise<void> {
    // ✅ SOLO verificar si AMBOS ya marcaron Y tienen estados DIFERENTES
    if (seguimiento.recepcion_marco !== 1 || seguimiento.terapeuta_marco !== 1) {
      console.log(`⏭️ Cita ${citaId} - Aún no marcaron ambos, sin inconsistencia`);
      return; // No hay inconsistencia aún, falta que marque alguien
    }

    // Verificar si hay discrepancia (estados diferentes)
    const hayDiscrepancia = seguimiento.recepcion_estado_id !== seguimiento.terapeuta_estado_id;

    if (!hayDiscrepancia) {
      console.log(`✅ Cita ${citaId} - Ambos marcaron lo mismo (estado ${seguimiento.recepcion_estado_id}), sin inconsistencia`);
      return; // Todo bien, ambos marcaron lo mismo
    }

    console.log(`⚠️ INCONSISTENCIA DETECTADA en cita ${citaId}: Admisión marcó ${seguimiento.recepcion_estado_id}, Terapeuta marcó ${seguimiento.terapeuta_estado_id}`);

    // Verificar si ya se notificó
    const yaNotificado = await this.verificarSiYaSeNotifico(citaId);
    if (yaNotificado) {
      console.log(`⏭️ Cita ${citaId} ya tiene notificación de inconsistencia, saltando...`);
      return;
    }

    // Obtener información de la cita
    try {
      const citaCompleta = await this.citaRepo.query(`
        SELECT
          c.id,
          c.fecha,
          c.hora_inicio,
          CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, '')) as paciente_nombre,
          CONCAT(tc.nombres, ' ', tc.apellidos) as terapeuta_nombre
        FROM citas c
        INNER JOIN paciente p ON c.paciente_id = p.id
        INNER JOIN trabajador_centro tc ON c.doctor_id = tc.id
        WHERE c.id = ?
      `, [citaId]);

      if (citaCompleta && citaCompleta[0]) {
        const info = citaCompleta[0];
        await this.notificacionesService.notificarInconsistenciaAsistencia(
          citaId,
          info.paciente_nombre,
          info.terapeuta_nombre,
          info.fecha,
          info.hora_inicio,
          seguimiento.recepcion_estado_id,
          seguimiento.terapeuta_estado_id,
          true, // recepcion_marco
          true, // terapeuta_marco
        );

        console.log(`🚨 Notificación de inconsistencia creada para cita ${citaId} (Estados diferentes: ${seguimiento.recepcion_estado_id} vs ${seguimiento.terapeuta_estado_id})`);
      }
    } catch (error) {
      console.error('❌ Error al generar notificación de inconsistencia:', error);
    }
  }

}