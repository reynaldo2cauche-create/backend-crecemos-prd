import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionesService } from './notificaciones.service';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { SeguimientoAsistencia } from '../citas/entities/seguimiento-asistencia.entity';
import { Tarea } from '../tareas/entities/tarea.entity';
import { TareaAsignacion } from '../tareas/entities/tarea-asignacion.entity';


@Injectable()
export class NotificacionesScheduler {
  private readonly logger = new Logger(NotificacionesScheduler.name);
  private intervalId: NodeJS.Timeout;
  private intervalTareasId: NodeJS.Timeout;
  private sincronizacionInicialCompletada = false;



  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadoresRepo: Repository<TrabajadorCentro>,
    @InjectRepository(Paciente)
    private pacientesRepo: Repository<Paciente>,
    private notificacionesService: NotificacionesService,
    @InjectRepository(SeguimientoAsistencia)
    private seguimientoRepo: Repository<SeguimientoAsistencia>,
    @InjectRepository(Tarea)
    private tareaRepo: Repository<Tarea>,
    @InjectRepository(TareaAsignacion)
    private tareaAsignacionRepo: Repository<TareaAsignacion>,
  ) {}

  async iniciar() {
    this.logger.log('🔔 Scheduler de notificaciones iniciado');

    // Ejecutar sincronización inicial solo la primera vez
    await this.ejecutarSincronizacionInicial();

    // Verificaciones generales cada hora (cumpleaños, aniversarios, inconsistencias, archivado)
    this.verificarNotificaciones();
    this.archivarTareasAntiguasA3AM();
    this.intervalId = setInterval(() => {
      this.verificarNotificaciones();
      this.verificarInconsistenciasAsistenciaA9PM();
      this.archivarTareasAntiguasA3AM();
    }, 3600000);

    // Tareas vencidas: chequeo cada 5 minutos para notificar rápido
    this.verificarTareasVencidas();
    this.intervalTareasId = setInterval(() => {
      this.verificarTareasVencidas();
    }, 300000); // 5 minutos
  }

  detener() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.intervalTareasId) {
      clearInterval(this.intervalTareasId);
    }
    this.logger.log('🔕 Scheduler de notificaciones detenido');
  }

  /**
   * Ejecuta sincronización inicial solo la primera vez que se inicia el sistema
   * Verifica cumpleaños y aniversarios de hoy, mañana y pasado mañana
   */
  private async ejecutarSincronizacionInicial() {
    if (this.sincronizacionInicialCompletada) {
      return;
    }

    try {
      const esPrimeraVez = await this.verificarSiEsPrimeraEjecucion();

      if (!esPrimeraVez) {
        this.logger.log('ℹ️ Ya existen notificaciones previas, omitiendo sincronización inicial');
        this.sincronizacionInicialCompletada = true;
        return;
      }

      this.logger.log('🔄 Ejecutando sincronización inicial (primera vez)...');

      // Sincronizar cumpleaños de pacientes para hoy, mañana y pasado mañana
      await this.sincronizarCumpleaniosPacientesInicial();

      // Sincronizar cumpleaños de empleados para hoy, mañana y pasado mañana
      await this.sincronizarCumpleanosEmpleadosInicial();

      // Sincronizar aniversarios laborales (0-7 días)
      await this.sincronizarAniversariosInicial();

      this.sincronizacionInicialCompletada = true;
      this.logger.log('✅ Sincronización inicial completada');
    } catch (error) {
      this.logger.error(`❌ Error en sincronización inicial: ${error.message}`);
    }
  }

  /**
   * Verifica si es la primera ejecución del scheduler
   * Retorna true si no existen notificaciones de cumpleaños o aniversarios
   */
  private async verificarSiEsPrimeraEjecucion(): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM eventos_sistema
        WHERE tipo_evento IN ('CUMPLEANOS_PACIENTE', 'CUMPLEANOS_EMPLEADO', 'ANIVERSARIO_LABORAL')
          AND fecha_evento >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `;

      const result = await this.trabajadoresRepo.query(query);
      const total = parseInt(result[0].total);

      return total === 0;
    } catch (error) {
      this.logger.error(`Error al verificar primera ejecución: ${error.message}`);
      return false;
    }
  }

  /**
   * Sincroniza cumpleaños de pacientes para 0, 1 y 2 días
   */
  private async sincronizarCumpleaniosPacientesInicial() {
    this.logger.log('🎂 Sincronizando cumpleaños de pacientes (0, 1, 3 días)...');

    // 0 = hoy, 1 = mañana, 2 = lunes cuando hoy es sábado
    for (const dias of [0, 1, 2]) {
      await this.verificarCumpleaniosEnDias(dias, [1, 2]);
    }

    this.logger.log('✅ Cumpleaños de pacientes sincronizados');
  }

  /**
   * Sincroniza cumpleaños de empleados para 0, 1 y 2 días
   */
  private async sincronizarCumpleanosEmpleadosInicial() {
    this.logger.log('🎂 Sincronizando cumpleaños de empleados (0, 1, 2 días)...');

    for (let dias = 0; dias <= 2; dias++) {
      await this.verificarCumpleanosEmpleadosEnDias(dias);
    }

    this.logger.log('✅ Cumpleaños de empleados sincronizados');
  }

  /**
   * Sincroniza aniversarios laborales para 0-7 días
   */
  private async sincronizarAniversariosInicial() {
    this.logger.log('📅 Sincronizando aniversarios laborales (0-7 días)...');

    for (let dias = 0; dias <= 7; dias++) {
      await this.verificarAniversariosEnDias(dias);
    }

    this.logger.log('✅ Aniversarios laborales sincronizados');
  }

  private async verificarNotificaciones() {
    this.logger.log('🔍 Verificando notificaciones programadas...');

    try {
      const fechaHoy = this.getFechaHoyLima();
      this.logger.log(`📅 Verificando cumpleaños/aniversarios para el día: ${fechaHoy}`);

      // La deduplicación se resuelve en cada método comparando contra la BD por fecha del día.
      // No se usa variable en memoria para evitar re-notificaciones tras reinicios del servidor.
      await Promise.all([
        this.verificarAniversariosLaborales(),
        this.verificarCumpleaniosPacientes(),
        this.verificarCumpleanosEmpleados(),
      ]);

      this.logger.log(`✅ Verificación completada para ${fechaHoy}`);
    } catch (error) {
      this.logger.error(`❌ Error en verificación: ${error.message}`);
    }
  }

  private async verificarAniversariosLaborales() {
    try {
      const query = `
        SELECT
          tc.id,
          tc.nombres,
          tc.apellidos,
          tc.fecha_ingreso,
          tc.cargo_id,
          c.nombre as cargo_nombre,
          YEAR(CURDATE()) - YEAR(tc.fecha_ingreso) as anos_servicio
        FROM trabajador_centro tc
        LEFT JOIN cargos c ON c.id = tc.cargo_id
        WHERE tc.estado = 1
          AND tc.fecha_ingreso IS NOT NULL
          AND DATEDIFF(
            DATE_ADD(tc.fecha_ingreso, INTERVAL YEAR(CURDATE()) - YEAR(tc.fecha_ingreso) YEAR),
            CURDATE()
          ) = 7
          AND YEAR(CURDATE()) > YEAR(tc.fecha_ingreso)
      `;

      const empleados = await this.trabajadoresRepo.query(query);

      for (const empleado of empleados) {
        const existeNotificacion = await this.verificarAniversarioExistente(
          empleado.id,
          this.getFechaHoyLima()
        );

        if (!existeNotificacion) {
          const nombreCompleto = `${empleado.nombres} ${empleado.apellidos}`;
          const fechaIngreso = new Date(empleado.fecha_ingreso).toLocaleDateString('es-ES');

          await this.notificacionesService.notificarAniversarioLaboral(
            empleado.id,
            nombreCompleto,
            fechaIngreso,
            empleado.anos_servicio,
            empleado.cargo_nombre || 'No especificado',
            1,
          );

          this.logger.log(`📅 Notificación de aniversario creada para ${nombreCompleto} (${empleado.anos_servicio} años)`);
        }
      }
    } catch (error) {
      this.logger.error(`Error al verificar aniversarios: ${error.message}`);
    }
  }

  private async verificarCumpleaniosPacientes() {
    try {
      const ahora = this.getAhoraLima();
      const hora = ahora.getHours();
      const diaSemana = ahora.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb

      // Domingo: no se notifica
      if (diaSemana === 0) return;

      // Sábado: ventana 8-10am — notifica domingo (1 día) y lunes (2 días)
      if (diaSemana === 6) {
        if (hora >= 8 && hora < 10) {
          await this.verificarCumpleaniosEnDias(1, [1, 2]); // domingo
          await this.verificarCumpleaniosEnDias(2, [1, 2]); // lunes
        }
        return;
      }

      // Lunes a Viernes: ventana 10am-12pm — solo notifica cumpleaños de mañana
      if (hora >= 10 && hora < 12) {
        await this.verificarCumpleaniosEnDias(1, [1, 2]);
      }
    } catch (error) {
      this.logger.error(`Error al verificar cumpleaños: ${error.message}`);
    }
  }

  private getAhoraLima(): Date {
    const ahora = new Date();
    const limaOffset = -5 * 60;
    const utcMinutes = ahora.getTime() / 60000 + ahora.getTimezoneOffset();
    return new Date((utcMinutes + limaOffset) * 60000);
  }

  private async verificarCumpleaniosEnDias(dias: number, roles: number[]) {
    try {
      const query = `
        SELECT
          id,
          nombres,
          apellido_paterno,
          apellido_materno,
          fecha_nacimiento,
          YEAR(CURDATE()) - YEAR(fecha_nacimiento)  as edad_cumplira
        FROM paciente
        WHERE fecha_nacimiento IS NOT NULL
          AND estado_paciente_id != 5
          AND mostrar_en_listado = 1
          AND DATEDIFF(
            DATE_ADD(fecha_nacimiento, INTERVAL YEAR(CURDATE()) - YEAR(fecha_nacimiento) YEAR),
            CURDATE()
          ) = ?
      `;

      const pacientes = await this.pacientesRepo.query(query, [dias]);

      for (const paciente of pacientes) {
        const existeNotificacion = await this.verificarCumpleanosExistente(
          paciente.id,
          this.getFechaHoyLima(),
          roles
        );

        if (!existeNotificacion) {
          const nombreCompleto = `${paciente.nombres} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim();
          const fechaNacimiento = new Date(paciente.fecha_nacimiento).toLocaleDateString('es-ES');

          await this.notificacionesService.notificarCumpleanospPaciente(
            paciente.id,
            nombreCompleto,
            fechaNacimiento,
            paciente.edad_cumplira,
            1,
            roles,
          );

          this.logger.log(`🎂 Notificación de cumpleaños creada para ${nombreCompleto} (${dias} días antes) - Roles: [${roles.join(', ')}]`);
        }
      }
    } catch (error) {
      this.logger.error(`Error al verificar cumpleaños en ${dias} días: ${error.message}`);
    }
  }

  

  /**
   * Verifica si ya existe una notificación de ANIVERSARIO para un empleado en el año actual
   * MEJORADO: Verifica que fue creada HOY para evitar duplicados
   */
  private async verificarAniversarioExistente(
    empleadoId: number,
    fecha: string, // YYYY-MM-DD en timezone Lima (mantenido para compatibilidad, no se usa en SQL)
  ): Promise<boolean> {
    try {
      // Usamos DATE(e.fecha_evento) = CURDATE() en lugar de CONVERT_TZ
      // para evitar el problema de NULL cuando MySQL ya retorna TIMESTAMP en timezone de sesión.
      const query = `
        SELECT COUNT(*) as total
        FROM eventos_sistema e
        INNER JOIN notificaciones n ON n.evento_id = e.id
        WHERE e.tipo_evento = 'ANIVERSARIO_LABORAL'
          AND JSON_EXTRACT(e.datos_adicionales, '$.empleado_id') = ?
          AND DATE(e.fecha_evento) = CURDATE()
      `;

      const result = await this.trabajadoresRepo.query(query, [empleadoId]);
      const existe = parseInt(result[0].total) > 0;

      if (existe) {
        this.logger.debug(`Ya existe notificación de aniversario para empleado ${empleadoId} el día ${fecha}`);
      }

      return existe;
    } catch (error) {
      this.logger.error(`Error al verificar aniversario existente: ${error.message}`);
      // Retornamos true (seguro) para evitar crear duplicados si falla la consulta
      return true;
    }
  }

  /**
   * Verifica si ya existe una notificación de CUMPLEAÑOS para un paciente en una fecha
   * Verifica por paciente_id y año actual del cumpleaños
   * MEJORADO: Validación MÁS ESTRICTA usando fecha exacta del día actual
   */
  private async verificarCumpleanosExistente(
    pacienteId: number,
    fecha: string, // YYYY-MM-DD en timezone Lima (mantenido para compatibilidad, no se usa en SQL)
    roles: number[],
  ): Promise<boolean> {
    try {
      // Usamos DATE(e.fecha_evento) = CURDATE() en lugar de CONVERT_TZ para evitar
      // que CONVERT_TZ retorne NULL cuando el TIMESTAMP ya viene en el timezone de sesión (Lima).
      // Ambos, DATE(e.fecha_evento) y CURDATE(), usan el mismo timezone de sesión MySQL.
      const query = `
        SELECT COUNT(DISTINCT e.id) as total
        FROM eventos_sistema e
        INNER JOIN notificaciones n ON n.evento_id = e.id
        WHERE e.tipo_evento = 'CUMPLEANOS_PACIENTE'
          AND JSON_EXTRACT(e.datos_adicionales, '$.paciente_id') = ?
          AND DATE(e.fecha_evento) = CURDATE()
      `;

      const result = await this.trabajadoresRepo.query(query, [pacienteId]);
      const existe = parseInt(result[0].total) > 0;

      if (existe) {
        this.logger.debug(`✅ Ya existe notificación de cumpleaños para paciente ${pacienteId} el día ${fecha}`);
      }

      return existe;
    } catch (error) {
      this.logger.error(`Error al verificar cumpleaños existente: ${error.message}`);
      // Retornamos true (seguro) para evitar crear duplicados si falla la consulta
      return true;
    }
  }

 
  private async verificarCumpleanosEmpleados() {
    try {
      const query = `
        SELECT
          tc.id,
          tc.nombres,
          tc.apellidos,
          tc.fecha_nacimiento,
          c.nombre as cargo_nombre,
          YEAR(CURDATE()) - YEAR(tc.fecha_nacimiento) as edad_cumplira
        FROM trabajador_centro tc
        LEFT JOIN cargos c ON c.id = tc.cargo_id
        WHERE tc.estado = 1
          AND tc.fecha_nacimiento IS NOT NULL
          AND DATEDIFF(
            DATE_ADD(tc.fecha_nacimiento, INTERVAL YEAR(CURDATE()) - YEAR(tc.fecha_nacimiento) YEAR),
            CURDATE()
          ) = 2
      `;

      const empleados = await this.trabajadoresRepo.query(query);

      this.logger.log(`📋 Encontrados ${empleados.length} cumpleaños de empleados en 2 días`);

      for (const empleado of empleados) {
        const existeNotificacion = await this.verificarNotificacionExistente(
          'CUMPLEANOS_EMPLEADO',
          empleado.id,
          this.getFechaHoyLima()
        );

        if (!existeNotificacion) {
          const nombreCompleto = `${empleado.nombres} ${empleado.apellidos}`;
          const fechaNacimiento = new Date(empleado.fecha_nacimiento).toLocaleDateString('es-ES');

          await this.notificacionesService.notificarCumpleanosEmpleado(
            empleado.id,
            nombreCompleto,
            fechaNacimiento,
            empleado.edad_cumplira,
            empleado.cargo_nombre || 'No especificado',
            1, // Usuario sistema
          );

          this.logger.log(`🎂 ✅ Notificación de cumpleaños creada para empleado ${nombreCompleto} (${empleado.edad_cumplira} años)`);
        }
      }
    } catch (error) {
      this.logger.error(`Error al verificar cumpleaños de empleados: ${error.message}`);
    }
  }

  /**
   * Verifica cumpleaños de empleados en N días (parametrizado para sincronización inicial)
   */
  private async verificarCumpleanosEmpleadosEnDias(dias: number) {
    try {
      const query = `
        SELECT
          tc.id,
          tc.nombres,
          tc.apellidos,
          tc.fecha_nacimiento,
          c.nombre as cargo_nombre,
          YEAR(CURDATE()) - YEAR(tc.fecha_nacimiento) as edad_cumplira
        FROM trabajador_centro tc
        LEFT JOIN cargos c ON c.id = tc.cargo_id
        WHERE tc.estado = 1
          AND tc.fecha_nacimiento IS NOT NULL
          AND DATEDIFF(
            DATE_ADD(tc.fecha_nacimiento, INTERVAL YEAR(CURDATE()) - YEAR(tc.fecha_nacimiento) YEAR),
            CURDATE()
          ) = ?
      `;

      const empleados = await this.trabajadoresRepo.query(query, [dias]);

      for (const empleado of empleados) {
        const existeNotificacion = await this.verificarNotificacionExistente(
          'CUMPLEANOS_EMPLEADO',
          empleado.id,
          this.getFechaHoyLima()
        );

        if (!existeNotificacion) {
          const nombreCompleto = `${empleado.nombres} ${empleado.apellidos}`;
          const fechaNacimiento = new Date(empleado.fecha_nacimiento).toLocaleDateString('es-ES');

          await this.notificacionesService.notificarCumpleanosEmpleado(
            empleado.id,
            nombreCompleto,
            fechaNacimiento,
            empleado.edad_cumplira,
            empleado.cargo_nombre || 'No especificado',
            1,
          );

          this.logger.log(`🎂 Notificación de cumpleaños creada para empleado ${nombreCompleto} (${dias} días antes)`);
        }
      }
    } catch (error) {
      this.logger.error(`Error al verificar cumpleaños de empleados en ${dias} días: ${error.message}`);
    }
  }

  /**
   * Verifica aniversarios laborales en N días (parametrizado para sincronización inicial)
   */
  private async verificarAniversariosEnDias(dias: number) {
    try {
      const query = `
        SELECT
          tc.id,
          tc.nombres,
          tc.apellidos,
          tc.fecha_ingreso,
          tc.cargo_id,
          c.nombre as cargo_nombre,
          YEAR(CURDATE()) - YEAR(tc.fecha_ingreso) as anos_servicio
        FROM trabajador_centro tc
        LEFT JOIN cargos c ON c.id = tc.cargo_id
        WHERE tc.estado = 1
          AND tc.fecha_ingreso IS NOT NULL
          AND DATEDIFF(
            DATE_ADD(tc.fecha_ingreso, INTERVAL YEAR(CURDATE()) - YEAR(tc.fecha_ingreso) YEAR),
            CURDATE()
          ) = ?
          AND YEAR(CURDATE()) > YEAR(tc.fecha_ingreso)
      `;

      const empleados = await this.trabajadoresRepo.query(query, [dias]);

      for (const empleado of empleados) {
        const existeNotificacion = await this.verificarAniversarioExistente(
          empleado.id,
          this.getFechaHoyLima()
        );

        if (!existeNotificacion) {
          const nombreCompleto = `${empleado.nombres} ${empleado.apellidos}`;
          const fechaIngreso = new Date(empleado.fecha_ingreso).toLocaleDateString('es-ES');

          await this.notificacionesService.notificarAniversarioLaboral(
            empleado.id,
            nombreCompleto,
            fechaIngreso,
            empleado.anos_servicio,
            empleado.cargo_nombre || 'No especificado',
            1,
          );

          this.logger.log(`📅 Notificación de aniversario creada para ${nombreCompleto} (${dias} días antes)`);
        }
      }
    } catch (error) {
      this.logger.error(`Error al verificar aniversarios en ${dias} días: ${error.message}`);
    }
  }

  /**
   * Verifica si ya existe una notificación del tipo especificado
   * MEJORADO: Validación MÁS ESTRICTA usando fecha exacta de creación HOY
   */
  private async verificarNotificacionExistente(
    tipoEvento: string,
    entidadId: number,
    fecha: string, // YYYY-MM-DD en timezone Lima (mantenido para compatibilidad, no se usa en SQL)
    roles?: number[]
  ): Promise<boolean> {
    try {
      let query: string;
      let params: any[];

      // Usamos DATE(e.fecha_evento) = CURDATE() en lugar de CONVERT_TZ
      // para evitar el problema de NULL cuando MySQL ya retorna TIMESTAMP en timezone de sesión.
      if (tipoEvento === 'ANIVERSARIO_LABORAL') {
        query = `
          SELECT COUNT(*) as total
          FROM eventos_sistema e
          INNER JOIN notificaciones n ON n.evento_id = e.id
          WHERE e.tipo_evento = ?
            AND JSON_EXTRACT(e.datos_adicionales, '$.empleado_id') = ?
            AND DATE(e.fecha_evento) = CURDATE()
        `;
        params = [tipoEvento, entidadId];
      } else if (tipoEvento === 'CUMPLEANOS_PACIENTE' && roles) {
        query = `
          SELECT COUNT(DISTINCT e.id) as total
          FROM eventos_sistema e
          INNER JOIN notificaciones n ON n.evento_id = e.id
          INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
          WHERE e.tipo_evento = ?
            AND JSON_EXTRACT(e.datos_adicionales, '$.paciente_id') = ?
            AND DATE(e.fecha_evento) = CURDATE()
            AND nd.rol_id IN (${roles.join(',')})
        `;
        params = [tipoEvento, entidadId];
      } else if (tipoEvento === 'CUMPLEANOS_EMPLEADO') {
        query = `
          SELECT COUNT(*) as total
          FROM eventos_sistema e
          INNER JOIN notificaciones n ON n.evento_id = e.id
          WHERE e.tipo_evento = ?
            AND JSON_EXTRACT(e.datos_adicionales, '$.empleado_id') = ?
            AND DATE(e.fecha_evento) = CURDATE()
        `;
        params = [tipoEvento, entidadId];
      } else {
        return false;
      }

      const result = await this.trabajadoresRepo.query(query, params);
      const existe = parseInt(result[0].total) > 0;

      if (existe) {
        this.logger.debug(`✅ Ya existe notificación ${tipoEvento} para entidad ${entidadId} el día ${fecha}`);
      }

      return existe;
    } catch (error) {
      this.logger.error(`Error al verificar notificación existente: ${error.message}`);
      // Retornamos true (seguro) para evitar crear duplicados si falla la consulta
      return true;
    }
  }


  /**
   * ✅ Verifica si es hora de revisar inconsistencias (solo a las 9 PM)
   */
  private async verificarInconsistenciasAsistenciaA9PM() {
    const ahora = new Date();
    const hora = ahora.getHours();

    // Solo ejecutar a las 9 PM (21:00)
    if (hora === 21) {
      this.logger.log('🕘 Es hora de verificar inconsistencias (9 PM)');
      await this.verificarInconsistenciasAsistencia();
    }
  }

  /**
   * ✅ MÉTODO CORREGIDO: Verifica inconsistencias de asistencia del DÍA ACTUAL
   *
   * Detecta 4 tipos de inconsistencias:
   * 1. Ninguno marcó después de 24 horas - ni admisión ni terapeuta registraron (SOLO SI YA PASARON 24 HORAS)
   * 2. Solo terapeuta marcó - admisión no registró
   * 3. Solo admisión marcó - terapeuta no registró
   * 4. Ambos marcaron estados diferentes - uno marcó 7, otro marcó 6
   *
   * Se ejecuta a las 9 PM y verifica las citas del DÍA ACTUAL
   */
  private async verificarInconsistenciasAsistencia() {
    try {
      this.logger.log('🔍 Verificando inconsistencias de asistencia del DÍA ACTUAL...');

      // ✅ Obtener solo la fecha de hoy
      const hoy = new Date();
      const fechaHoy = this.formatearFecha(hoy);

      this.logger.log(`📅 Verificando citas del día: ${fechaHoy}`);

      // ✅ QUERY CORREGIDA: Buscar SOLO citas con inconsistencias reales (excluir las que ambos marcaron correctamente)
      const query = `
        SELECT
          c.id as cita_id,
          CONCAT(c.fecha, ' ', c.hora_inicio) AS fecha_cita,
          c.fecha,
          c.hora_inicio,
          CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, '')) AS paciente_nombre,
          CONCAT(tc.nombres, ' ', tc.apellidos) AS terapeuta_nombre,
          COALESCE(sa.recepcion_marco, 0) as recepcion_marco,
          sa.recepcion_estado_id,
          COALESCE(sa.terapeuta_marco, 0) as terapeuta_marco,
          sa.terapeuta_estado_id,
          TIMESTAMPDIFF(HOUR, CONCAT(c.fecha, ' ', c.hora_inicio), NOW()) as horas_transcurridas,
          -- Determinar el tipo de inconsistencia
          CASE
            -- Caso 1: Ninguno marcó (sin importar las horas, se cuenta si es del día)
            WHEN (COALESCE(sa.recepcion_marco, 0) = 0 AND COALESCE(sa.terapeuta_marco, 0) = 0)
            THEN 'NINGUNO_MARCO'
            -- Caso 2: Solo terapeuta marcó
            WHEN (COALESCE(sa.recepcion_marco, 0) = 0 AND COALESCE(sa.terapeuta_marco, 0) = 1)
            THEN 'SOLO_TERAPEUTA'
            -- Caso 3: Solo admisión marcó
            WHEN (COALESCE(sa.recepcion_marco, 0) = 1 AND COALESCE(sa.terapeuta_marco, 0) = 0)
            THEN 'SOLO_ADMISION'
            -- Caso 4: Ambos marcaron pero estados diferentes
            WHEN (COALESCE(sa.recepcion_marco, 0) = 1 AND COALESCE(sa.terapeuta_marco, 0) = 1
                  AND sa.recepcion_estado_id != sa.terapeuta_estado_id)
            THEN 'ESTADOS_DIFERENTES'
            ELSE NULL
          END as tipo_inconsistencia
        FROM citas c
        LEFT JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
        INNER JOIN paciente p ON c.paciente_id = p.id
        INNER JOIN trabajador_centro tc ON c.doctor_id = tc.id
        WHERE c.fecha >= ?
          AND c.fecha <= ?
          AND c.flg_activo = 1
          -- ✅ EXCLUIR citas donde ambos marcaron el MISMO estado (sin inconsistencia)
          AND NOT (
            COALESCE(sa.recepcion_marco, 0) = 1
            AND COALESCE(sa.terapeuta_marco, 0) = 1
            AND sa.recepcion_estado_id = sa.terapeuta_estado_id
          )
        HAVING tipo_inconsistencia IS NOT NULL
        ORDER BY c.fecha DESC, c.hora_inicio DESC
      `;

      const inconsistencias = await this.seguimientoRepo.query(query, [
        fechaHoy,
        fechaHoy,
      ]);

      this.logger.log(`📋 Encontradas ${inconsistencias.length} inconsistencias del día ${fechaHoy}`);

      // ✅ Si hay inconsistencias, crear UNA SOLA notificación con el conteo total
      if (inconsistencias.length > 0) {
        // Verificar si ya se notificó hoy
        const yaNotificadoHoy = await this.verificarNotificacionInconsistenciaHoy(fechaHoy);

        if (yaNotificadoHoy) {
          this.logger.log(`⏭️ Ya se notificaron las inconsistencias del día ${fechaHoy}, saltando...`);
          return;
        }

        // Crear UNA notificación con el conteo total
        try {
          this.logger.log(`📝 Creando evento...`);
          const evento = await this.notificacionesService.crearEvento({
            tipo_evento: 'INCONSISTENCIA_ASISTENCIA_DIARIA',
            descripcion: `Resumen de inconsistencias del ${fechaHoy}`,
            usuario_id: 1,
            datos_adicionales: {
              fecha: fechaHoy,
              total_inconsistencias: inconsistencias.length,
            },
          });

          this.logger.log(`✅ Evento creado con ID: ${evento.id}`);

          this.logger.log(`📝 Creando notificación con evento_id: ${evento.id}...`);
          const notif = await this.notificacionesService.crearNotificacion({
            tipo_notificacion: 'INCONSISTENCIA_DIARIA',
            titulo: 'Inconsistencias de Asistencia',
            mensaje: `Hoy ${fechaHoy} se detectaron ${inconsistencias.length} inconsistencias de asistencia`,
            evento_id: evento.id,
            roles_destino: [1], // Solo administradores
          });

          this.logger.log(`✅ Notificación creada con ID: ${notif.id}`);
          this.logger.log(`🚨 Notificación diaria creada: ${inconsistencias.length} inconsistencias del ${fechaHoy}`);
        } catch (errorNotif) {
          this.logger.error(`❌ Error al crear notificación: ${errorNotif.message}`);
          this.logger.error(`Stack: ${errorNotif.stack}`);
          throw errorNotif;
        }
      } else {
        this.logger.log(`✅ No hay inconsistencias del día ${fechaHoy}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error en verificación de inconsistencias: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
    }
  }

  /**
   * ✅ Formatea una fecha a formato YYYY-MM-DD
   */
  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Devuelve la fecha actual en Lima (UTC-5) en formato YYYY-MM-DD.
   * NUNCA usar new Date().toISOString() para esto porque devuelve UTC
   * y Lima está 5 horas atrás — después de las 7pm Lima el día UTC ya cambió.
   */
 private getFechaHoyLima(): string {
  // Obtener hora actual en Lima (UTC-5)
  const ahora = new Date();
  const limaOffset = -5 * 60; // minutos
  const utcMinutes = ahora.getTime() / 60000 + ahora.getTimezoneOffset();
  const limaDate = new Date((utcMinutes + limaOffset) * 60000);
  
  const year = limaDate.getFullYear();
  const month = String(limaDate.getMonth() + 1).padStart(2, '0');
  const day = String(limaDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

  /**
   * ✅ Verifica si ya existe una notificación diaria de inconsistencias para una fecha
   */
  private async verificarNotificacionInconsistenciaHoy(fecha: string): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM eventos_sistema e
        INNER JOIN notificaciones n ON n.evento_id = e.id
        WHERE e.tipo_evento = 'INCONSISTENCIA_ASISTENCIA_DIARIA'
          AND JSON_EXTRACT(e.datos_adicionales, '$.fecha') = ?
      `;

      const result = await this.trabajadoresRepo.query(query, [fecha]);
      const existe = parseInt(result[0].total) > 0;

      if (existe) {
        this.logger.debug(`✅ Ya existe notificación diaria de inconsistencias para ${fecha}`);
      }

      return existe;
    } catch (error) {
      this.logger.error(`Error al verificar notificación diaria: ${error.message}`);
      return true;
    }
  }

  private async archivarTareasAntiguasA3AM() {
    const ahora = this.getAhoraLima();
    if (ahora.getHours() !== 3) return;
    try {
      const result = await this.tareaRepo.query(`
        UPDATE tareas t
        INNER JOIN tarea_columnas tc ON tc.id = t.columna_id
        SET t.archivado = 1
        WHERE t.archivado = 0
          AND tc.es_final = 1
          AND COALESCE(t.fecha_completado, t.updated_at) <= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const archivadas = result.affectedRows ?? 0;
      if (archivadas > 0) {
        this.logger.log(`📦 Archivado automático: ${archivadas} tarea(s) con más de 30 días completadas`);
      }
    } catch (error) {
      this.logger.error(`Error en archivado automático: ${error.message}`);
    }
  }

  private async verificarTareasVencidas() {
    try {
      const query = `
        SELECT t.id, t.titulo, t.user_crea_id
        FROM tareas t
        INNER JOIN tarea_columnas tc ON tc.id = t.columna_id
        WHERE t.fecha_limite < NOW()
          AND tc.es_final = 0
          AND t.archivado = 0
          AND NOT EXISTS (
            SELECT 1 FROM eventos_sistema e
            WHERE e.tipo_evento = 'TAREA_VENCIDA'
              AND JSON_EXTRACT(e.datos_adicionales, '$.tarea_id') = t.id
              AND DATE(e.fecha_evento) = CURDATE()
          )
      `;

      const tareasVencidas = await this.tareaRepo.query(query);

      for (const tarea of tareasVencidas) {
        const asignaciones = await this.tareaAsignacionRepo.find({ where: { tarea_id: tarea.id } });
        await this.notificacionesService.notificarTareaVencida(
          tarea.id,
          tarea.titulo,
          asignaciones.map(a => ({ usuario_id: a.usuario_id ?? undefined, rol_id: a.rol_id ?? undefined })),
          tarea.user_crea_id,
        );
        this.logger.log(`Tarea vencida notificada: #${tarea.id} "${tarea.titulo}"`);
      }
    } catch (error) {
      this.logger.error(`Error al verificar tareas vencidas: ${error.message}`);
    }
  }
}