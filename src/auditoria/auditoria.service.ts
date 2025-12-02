import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { AuditoriaAccion } from './auditoria-accion.entity';
import { RegistrarAuditoriaDto } from './dto/registrar-auditoria.dto';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(AuditoriaAccion)
    private auditoriaRepository: Repository<AuditoriaAccion>,
  ) {}

  /**
   * Registra una acción de auditoría de forma asíncrona
   * No lanza excepciones para evitar afectar el flujo principal
   */
  async registrar(dto: RegistrarAuditoriaDto): Promise<void> {
    try {
      const auditoria = this.auditoriaRepository.create(dto);
      await this.auditoriaRepository.save(auditoria);
      this.logger.debug(`Auditoría registrada: ${dto.accion} - ${dto.descripcion}`);
    } catch (error) {
      this.logger.error('Error al registrar auditoría:', error);
      // No lanzamos el error para no afectar la operación principal
    }
  }

  /**
   * Obtiene el historial de auditoría con filtros
   */
  async obtenerHistorial(filtros: FiltrarAuditoriaDto) {
    const {
      trabajadorId,
      modulo,
      accion,
      entidadTipo,
      entidadId,
      fechaInicio,
      fechaFin,
      busqueda,
      page = 1,
      limit = 50,
    } = filtros;

    const queryBuilder = this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .leftJoinAndSelect('auditoria.trabajador', 'trabajador');

    // Filtros
    if (trabajadorId) {
      queryBuilder.andWhere('auditoria.trabajadorId = :trabajadorId', { trabajadorId });
    }

    if (modulo) {
      queryBuilder.andWhere('auditoria.modulo = :modulo', { modulo });
    }

    if (accion) {
      queryBuilder.andWhere('auditoria.accion = :accion', { accion });
    }

    if (entidadTipo) {
      queryBuilder.andWhere('auditoria.entidadTipo = :entidadTipo', { entidadTipo });
    }

    if (entidadId) {
      queryBuilder.andWhere('auditoria.entidadId = :entidadId', { entidadId });
    }

    if (fechaInicio && fechaFin) {
      queryBuilder.andWhere('auditoria.fechaHora BETWEEN :fechaInicio AND :fechaFin', {
        fechaInicio,
        fechaFin,
      });
    } else if (fechaInicio) {
      queryBuilder.andWhere('auditoria.fechaHora >= :fechaInicio', { fechaInicio });
    } else if (fechaFin) {
      queryBuilder.andWhere('auditoria.fechaHora <= :fechaFin', { fechaFin });
    }

    if (busqueda) {
      queryBuilder.andWhere(
        '(auditoria.descripcion LIKE :busqueda OR auditoria.trabajadorNombre LIKE :busqueda OR auditoria.entidadNombre LIKE :busqueda)',
        { busqueda: `%${busqueda}%` },
      );
    }

    // Ordenar por fecha descendente
    queryBuilder.orderBy('auditoria.fechaHora', 'DESC');

    // Paginación
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [registros, total] = await queryBuilder.getManyAndCount();

    return {
      registros,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtiene el historial de una entidad específica
   */
  async obtenerHistorialEntidad(entidadTipo: string, entidadId: number) {
    return this.auditoriaRepository.find({
      where: { entidadTipo, entidadId },
      order: { fechaHora: 'DESC' },
      take: 100,
    });
  }

  /**
   * Obtiene estadísticas de auditoría
   */
/**
 * Obtiene estadísticas de auditoría
 */
async obtenerEstadisticas(fechaInicio?: Date, fechaFin?: Date) {
  const queryBuilder = this.auditoriaRepository.createQueryBuilder('auditoria');

  if (fechaInicio && fechaFin) {
    queryBuilder.where('auditoria.fechaHora BETWEEN :fechaInicio AND :fechaFin', {
      fechaInicio,
      fechaFin,
    });
  }

  const [
    totalAcciones,
    accionesPorModulo,
    accionesPorUsuario,
    accionesPorTipo,
  ] = await Promise.all([
    // Total de acciones
    queryBuilder.getCount(),

    // Acciones por módulo
    this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .select('auditoria.modulo', 'modulo')
      .addSelect('COUNT(*)', 'total')
      .groupBy('auditoria.modulo')
      .orderBy('total', 'DESC')
      .getRawMany(),

    // Acciones por usuario (top 10) - 👇 CORREGIDO
    this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .select('auditoria.trabajadorId', 'trabajadorId')
      .addSelect('auditoria.trabajadorNombre', 'usuario')  // 👈 Agregado al GROUP BY implícitamente
      .addSelect('COUNT(*)', 'total')
      .groupBy('auditoria.trabajadorId')
      .addGroupBy('auditoria.trabajadorNombre')  // 👈 AGREGADO
      .orderBy('total', 'DESC')
      .limit(10)
      .getRawMany(),

    // Acciones por tipo
    this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .select('auditoria.accion', 'accion')
      .addSelect('COUNT(*)', 'total')
      .groupBy('auditoria.accion')
      .orderBy('total', 'DESC')
      .limit(10)
      .getRawMany(),
  ]);

  return {
    totalAcciones,
    accionesPorModulo,
    accionesPorUsuario,
    accionesPorTipo,
  };
}
  /**
   * Obtiene actividad reciente de un usuario
   */
  async obtenerActividadUsuario(trabajadorId: number, limite: number = 20) {
    return this.auditoriaRepository.find({
      where: { trabajadorId },
      order: { fechaHora: 'DESC' },
      take: limite,
    });
  }

  /**
   * Cuenta acciones de un usuario en un periodo de tiempo
   */
  async contarAccionesUsuario(
    trabajadorId: number,
    accion?: string,
    minutosAtras: number = 30,
  ): Promise<number> {
    const fechaInicio = new Date(Date.now() - minutosAtras * 60 * 1000);

    const queryBuilder = this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .where('auditoria.trabajadorId = :trabajadorId', { trabajadorId })
      .andWhere('auditoria.fechaHora >= :fechaInicio', { fechaInicio });

    if (accion) {
      queryBuilder.andWhere('auditoria.accion = :accion', { accion });
    }

    return queryBuilder.getCount();
  }

  /**
   * Obtiene las últimas acciones (para dashboard)
   */
  async obtenerUltimasAcciones(limite: number = 10) {
    return this.auditoriaRepository.find({
      order: { fechaHora: 'DESC' },
      take: limite,
      relations: ['trabajador'],
    });
  }
}
