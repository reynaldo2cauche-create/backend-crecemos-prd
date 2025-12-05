import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertaSistema, SeveridadAlerta } from './alerta-sistema.entity';
import { ConfiguracionAlerta } from './configuracion-alerta.entity';
import { AuditoriaAccion } from './auditoria-accion.entity';
import { AuditoriaService } from './auditoria.service';

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectRepository(AlertaSistema)
    private alertaRepository: Repository<AlertaSistema>,
    @InjectRepository(ConfiguracionAlerta)
    private configRepository: Repository<ConfiguracionAlerta>,
    @InjectRepository(AuditoriaAccion)
    private auditoriaRepository: Repository<AuditoriaAccion>,
    private auditoriaService: AuditoriaService,
  ) {}

  /**
   * Evalúa si se debe generar una alerta basada en la auditoría
   */
  async evaluarYGenerarAlertas(auditoria: AuditoriaAccion): Promise<void> {
    try {
      const configuraciones = await this.configRepository.find({ where: { activa: true } });

      for (const config of configuraciones) {
        const debeAlertar = await this.evaluarCondicion(config, auditoria);
        if (debeAlertar) {
          await this.crearAlerta(config, auditoria);
        }
      }
    } catch (error) {
      this.logger.error('Error al evaluar alertas:', error);
    }
  }

  /**
   * Evalúa una condición específica
   */
  private async evaluarCondicion(
    config: ConfiguracionAlerta,
    auditoria: AuditoriaAccion,
  ): Promise<boolean> {
    const { condicionTipo, condicionValor } = config;

    switch (condicionTipo) {
      case 'UMBRAL_CANTIDAD':
        return this.evaluarUmbralCantidad(condicionValor, auditoria);

      case 'HORARIO':
        return this.evaluarHorario(condicionValor, auditoria);

      case 'CAMPO_CRITICO':
        return this.evaluarCampoCritico(condicionValor, auditoria);

      case 'CODIGO_RESPUESTA':
        return this.evaluarCodigoRespuesta(condicionValor, auditoria);

      default:
        return false;
    }
  }

  /**
   * Evalúa si se superó un umbral de cantidad de acciones
   */
  private async evaluarUmbralCantidad(condicion: any, auditoria: AuditoriaAccion): Promise<boolean> {
    const { limite, ventana_minutos, accion } = condicion;

    let contador = 0;

    if (accion) {
      // Contar acciones específicas
      contador = await this.auditoriaService.contarAccionesUsuario(
        auditoria.trabajadorId,
        accion,
        ventana_minutos,
      );
    } else {
      // Contar todas las acciones en la ventana de tiempo
      const fechaInicio = new Date(Date.now() - ventana_minutos * 60 * 1000);
      contador = await this.auditoriaRepository
        .createQueryBuilder('auditoria')
        .where('auditoria.trabajadorId = :trabajadorId', { trabajadorId: auditoria.trabajadorId })
        .andWhere('auditoria.fechaHora >= :fechaInicio', { fechaInicio })
        .getCount();
    }

    return contador >= limite;
  }

  /**
   * Evalúa si la acción ocurrió fuera del horario permitido
   */
  private evaluarHorario(condicion: any, auditoria: AuditoriaAccion): Promise<boolean> {
    const { hora_inicio, hora_fin } = condicion;
    const hora = auditoria.fechaHora.getHours();
    const minutos = auditoria.fechaHora.getMinutes();

    // Convertir a números para comparación
    const horaActualNum = hora * 100 + minutos;
    const horaInicioNum = parseInt(hora_inicio.split(':')[0]) * 100 + parseInt(hora_inicio.split(':')[1]);
    const horaFinNum = parseInt(hora_fin.split(':')[0]) * 100 + parseInt(hora_fin.split(':')[1]);

    // Está FUERA del horario permitido si es menor al inicio O mayor al fin
    const estaFueraHorario = horaActualNum < horaInicioNum || horaActualNum > horaFinNum;

    return Promise.resolve(estaFueraHorario);
  }

  /**
   * Evalúa si se modificó un campo crítico
   */
  private evaluarCampoCritico(condicion: any, auditoria: AuditoriaAccion): Promise<boolean> {
    const { modulo, accion, campo } = condicion;

    if (auditoria.modulo !== modulo) return Promise.resolve(false);
    if (accion && auditoria.accion !== accion) return Promise.resolve(false);

    // Verificar si el campo existe en datosNuevos (ya no tenemos datosAnteriores)
    if (campo && auditoria.datosNuevos) {
      const campoModificado = auditoria.datosNuevos[campo] !== undefined;
      return Promise.resolve(campoModificado);
    }

    return Promise.resolve(true);
  }

  /**
   * Evalúa si el código de respuesta coincide (ej: 403 - Acceso denegado)
   * NOTA: Esta funcionalidad ya no está disponible porque eliminamos la columna codigoRespuesta
   */
  private evaluarCodigoRespuesta(condicion: any, auditoria: AuditoriaAccion): Promise<boolean> {
    // Ya no existe la columna codigoRespuesta, esta evaluación siempre retorna false
    this.logger.warn('⚠️ Evaluación de código de respuesta deshabilitada (columna eliminada)');
    return Promise.resolve(false);
  }

  /**
   * Crea una nueva alerta
   */
  private async crearAlerta(config: ConfiguracionAlerta, auditoria: AuditoriaAccion): Promise<void> {
    const mensaje = this.generarMensajeAlerta(config, auditoria);

    // Obtener nombre del trabajador desde la relación
    const nombreTrabajador = auditoria.trabajador 
      ? `${auditoria.trabajador.nombres} ${auditoria.trabajador.apellidos}` 
      : 'Usuario desconocido';

    const alerta = this.alertaRepository.create({
      tipo: config.tipoAlerta,
      severidad: config.severidad,
      trabajadorId: auditoria.trabajadorId,
      trabajadorNombre: nombreTrabajador,
      titulo: config.nombre,
      mensaje,
      contexto: {
        accion: auditoria.accion,
        modulo: auditoria.modulo,
        descripcion: auditoria.descripcion,
        fechaHora: auditoria.fechaHora,
        ipAddress: auditoria.ipAddress,
      },
      auditoriaId: auditoria.id,
    });

    await this.alertaRepository.save(alerta);
    this.logger.warn(`Alerta generada: ${config.nombre} - ${mensaje}`);
  }

  /**
   * Genera el mensaje de la alerta
   */
  private generarMensajeAlerta(config: ConfiguracionAlerta, auditoria: AuditoriaAccion): string {
    const { condicionTipo, condicionValor } = config;

    // Obtener nombre del trabajador desde la relación
    const nombreTrabajador = auditoria.trabajador 
      ? `${auditoria.trabajador.nombres} ${auditoria.trabajador.apellidos}` 
      : 'Usuario desconocido';

    switch (condicionTipo) {
      case 'UMBRAL_CANTIDAD':
        const tipoAccion = condicionValor.accion || 'cualquier acción';
        return `${nombreTrabajador} realizó ${condicionValor.limite} acciones de tipo "${tipoAccion}" en ${condicionValor.ventana_minutos} minutos. Última acción: ${auditoria.descripcion}`;

      case 'HORARIO':
        return `${nombreTrabajador} accedió al sistema fuera del horario permitido (${condicionValor.hora_inicio} - ${condicionValor.hora_fin}). Acción: ${auditoria.descripcion}`;

      case 'CAMPO_CRITICO':
        return `${nombreTrabajador} modificó el campo crítico "${condicionValor.campo}". ${auditoria.descripcion}`;

      case 'CODIGO_RESPUESTA':
        return `${nombreTrabajador} - acción registrada. ${auditoria.descripcion}`;

      default:
        return auditoria.descripcion;
    }
  }

  /**
   * Obtiene alertas con filtros
   */
  async obtenerAlertas(filtros: {
    leida?: boolean;
    resuelta?: boolean;
    severidad?: SeveridadAlerta;
    tipo?: string;
    page?: number;
    limit?: number;
  }) {
    const { leida, resuelta, severidad, tipo, page = 1, limit = 20 } = filtros;

    const queryBuilder = this.alertaRepository
      .createQueryBuilder('alerta')
      .leftJoinAndSelect('alerta.trabajador', 'trabajador')
      .leftJoinAndSelect('alerta.auditoria', 'auditoria');

    if (leida !== undefined) {
      queryBuilder.andWhere('alerta.leida = :leida', { leida });
    }

    if (resuelta !== undefined) {
      queryBuilder.andWhere('alerta.resuelta = :resuelta', { resuelta });
    }

    if (severidad) {
      queryBuilder.andWhere('alerta.severidad = :severidad', { severidad });
    }

    if (tipo) {
      queryBuilder.andWhere('alerta.tipo = :tipo', { tipo });
    }

    queryBuilder.orderBy('alerta.fechaCreacion', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [alertas, total] = await queryBuilder.getManyAndCount();

    return {
      alertas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtiene el conteo de alertas no leídas
   */
  async contarNoLeidas(): Promise<number> {
    return this.alertaRepository.count({
      where: { leida: false },
    });
  }

  /**
   * Marca una alerta como leída
   */
  async marcarComoLeida(id: number): Promise<void> {
    await this.alertaRepository.update(id, {
      leida: true,
      fechaLeida: new Date(),
    });
  }

  /**
   * Marca todas las alertas como leídas
   */
  async marcarTodasComoLeidas(): Promise<void> {
    await this.alertaRepository.update(
      { leida: false },
      {
        leida: true,
        fechaLeida: new Date(),
      },
    );
  }

  /**
   * Marca una alerta como resuelta
   */
  async marcarComoResuelta(id: number, resolvidoPor: number, comentarios?: string): Promise<void> {
    await this.alertaRepository.update(id, {
      resuelta: true,
      fechaResuelta: new Date(),
      resueltoPor: resolvidoPor,
      comentariosResolucion: comentarios,
    });
  }

  /**
   * Obtiene estadísticas de alertas
   */
  async obtenerEstadisticas() {
    const [
      totalAlertas,
      alertasNoLeidas,
      alertasNoResueltas,
      alertasPorSeveridad,
      alertasPorTipo,
    ] = await Promise.all([
      this.alertaRepository.count(),
      this.alertaRepository.count({ where: { leida: false } }),
      this.alertaRepository.count({ where: { resuelta: false } }),
      this.alertaRepository
        .createQueryBuilder('alerta')
        .select('alerta.severidad', 'severidad')
        .addSelect('COUNT(*)', 'total')
        .where('alerta.resuelta = false')
        .groupBy('alerta.severidad')
        .getRawMany(),
      this.alertaRepository
        .createQueryBuilder('alerta')
        .select('alerta.tipo', 'tipo')
        .addSelect('COUNT(*)', 'total')
        .where('alerta.resuelta = false')
        .groupBy('alerta.tipo')
        .orderBy('total', 'DESC')
        .getRawMany(),
    ]);

    return {
      totalAlertas,
      alertasNoLeidas,
      alertasNoResueltas,
      alertasPorSeveridad,
      alertasPorTipo,
    };
  }
}