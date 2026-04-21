import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaAccion } from './auditoria-accion.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { RegistrarAuditoriaDto } from './dto/registrar-auditoria.dto';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(AuditoriaAccion)
    private auditoriaRepository: Repository<AuditoriaAccion>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
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
   * Completa los datos del usuario si no vienen en el token (para tokens antiguos)
   * Si el token ya tiene nombres, apellidos y rol, los devuelve sin hacer query
   */
  async completarDatosUsuario(user: any): Promise<any> {
    // Si ya tiene todos los datos, retornarlos directamente
    if (user.nombres && user.apellidos && user.rol) {
      this.logger.debug('✅ Usuario completo desde token');
      return user;
    }

    // Si faltan datos, buscarlos en la base de datos
    this.logger.warn('⚠️ Token antiguo detectado, buscando datos del usuario en BD...');

    try {
      const trabajador = await this.trabajadorRepository.findOne({
        where: { id: user.id },
        relations: ['rol'],
      });

      if (!trabajador) {
        this.logger.error(`❌ No se encontró el trabajador con ID ${user.id}`);
        return user; // Devolver user original aunque incompleto
      }

      const userCompleto = {
        ...user,
        nombres: trabajador.nombres,
        apellidos: trabajador.apellidos,
        rol: trabajador.rol,
      };

      this.logger.debug('✅ Datos de usuario completados desde BD:', JSON.stringify({
        id: userCompleto.id,
        nombres: userCompleto.nombres,
        apellidos: userCompleto.apellidos,
        rol: userCompleto.rol?.nombre,
      }, null, 2));

      return userCompleto;
    } catch (error) {
      this.logger.error('❌ Error al completar datos del usuario:', error);
      return user; // En caso de error, devolver user original
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
      fechaInicio,
      fechaFin,
      busqueda,
      page = 1,
      limit = 50,
    } = filtros;

    const queryBuilder = this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .leftJoinAndSelect('auditoria.trabajador', 'trabajador')
      .leftJoinAndSelect('trabajador.rol', 'rol');

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
        '(auditoria.descripcion LIKE :busqueda OR trabajador.nombres LIKE :busqueda OR trabajador.apellidos LIKE :busqueda OR trabajador.username LIKE :busqueda)',
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
        .where(fechaInicio && fechaFin ? 'auditoria.fechaHora BETWEEN :fechaInicio AND :fechaFin' : '1=1', {
          fechaInicio,
          fechaFin,
        })
        .groupBy('auditoria.modulo')
        .orderBy('total', 'DESC')
        .getRawMany(),

      // Acciones por usuario (top 10) - CON JOIN
      this.auditoriaRepository
        .createQueryBuilder('auditoria')
        .leftJoin('auditoria.trabajador', 'trabajador')
        .select('auditoria.trabajadorId', 'trabajadorId')
        .addSelect("CONCAT(trabajador.nombres, ' ', trabajador.apellidos)", 'usuario')
        .addSelect('trabajador.username', 'username')
        .addSelect('COUNT(*)', 'total')
        .where(fechaInicio && fechaFin ? 'auditoria.fechaHora BETWEEN :fechaInicio AND :fechaFin' : '1=1', {
          fechaInicio,
          fechaFin,
        })
        .groupBy('auditoria.trabajadorId')
        .addGroupBy('trabajador.nombres')
        .addGroupBy('trabajador.apellidos')
        .addGroupBy('trabajador.username')
        .orderBy('total', 'DESC')
        .limit(10)
        .getRawMany(),

      // Acciones por tipo
      this.auditoriaRepository
        .createQueryBuilder('auditoria')
        .select('auditoria.accion', 'accion')
        .addSelect('COUNT(*)', 'total')
        .where(fechaInicio && fechaFin ? 'auditoria.fechaHora BETWEEN :fechaInicio AND :fechaFin' : '1=1', {
          fechaInicio,
          fechaFin,
        })
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
      relations: ['trabajador', 'trabajador.rol'],
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
      relations: ['trabajador', 'trabajador.rol'],
    });
  }
}