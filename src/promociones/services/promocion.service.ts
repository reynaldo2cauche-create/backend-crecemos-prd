import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Promocion } from '../entities/promocion.entity';
import { PromocionRegla } from '../entities/promocion-regla.entity';
import { PromocionAlcance } from '../entities/promocion-alcance.entity';
import { CreatePromocionDto } from '../dto/create-promocion.dto';
import { UpdatePromocionDto } from '../dto/update-promocion.dto';

@Injectable()
export class PromocionService {
  constructor(
    @InjectRepository(Promocion)
    private readonly promocionRepo: Repository<Promocion>,
    @InjectRepository(PromocionRegla)
    private readonly reglaRepo: Repository<PromocionRegla>,
    @InjectRepository(PromocionAlcance)
    private readonly alcanceRepo: Repository<PromocionAlcance>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Obtener todas las promociones con filtros opcionales
   */
  async findAll(filtros?: {
    soloActivas?: boolean;
    soloVigentes?: boolean;
    fecha?: Date;
  }) {
    const qb = this.promocionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.reglas', 'reglas')
      .leftJoinAndSelect('reglas.condicion_tipo', 'condicion_tipo')
      .leftJoinAndSelect('reglas.beneficio_tipo', 'beneficio_tipo')
      .leftJoinAndSelect('reglas.beneficio_producto', 'beneficio_producto')
      .leftJoinAndSelect('p.alcances', 'alcances')
      .leftJoinAndSelect('alcances.tipo_alcance', 'tipo_alcance')
      .leftJoinAndSelect('alcances.motivo_cita', 'motivo_cita')
      .orderBy('p.created_at', 'DESC');

    if (filtros?.soloActivas) {
      qb.andWhere('p.flg_activo = 1');
    }

    if (filtros?.soloVigentes) {
      const fecha = filtros.fecha || new Date();
      qb.andWhere('p.fecha_inicio <= :fecha', { fecha })
        .andWhere('(p.fecha_fin IS NULL OR p.fecha_fin >= :fecha)', { fecha });
    }

    return qb.getMany();
  }

  /**
   * Obtener promoción por ID
   */
  async findOne(id: number) {
    const promocion = await this.promocionRepo.findOne({
      where: { id },
      relations: [
        'reglas',
        'reglas.condicion_tipo',
        'reglas.beneficio_tipo',
        'reglas.beneficio_producto',
        'alcances',
        'alcances.tipo_alcance',
        'alcances.motivo_cita',
        'user_crea',
        'user_actua',
      ],
    });

    if (!promocion) {
      throw new NotFoundException(`Promoción ${id} no encontrada`);
    }

    return promocion;
  }

  /**
   * Crear nueva promoción con reglas y alcances
   */
  async create(dto: CreatePromocionDto) {
    // Validaciones
    if (!dto.aplica_todo && (!dto.alcances || dto.alcances.length === 0)) {
      throw new BadRequestException(
        'Si aplica_todo es false, debe especificar al menos un alcance',
      );
    }

    if (dto.aplica_todo && dto.alcances && dto.alcances.length > 0) {
      throw new BadRequestException(
        'Si aplica_todo es true, no debe especificar alcances',
      );
    }

    // Validar fechas
    if (dto.fecha_fin && new Date(dto.fecha_fin) < new Date(dto.fecha_inicio)) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Crear con transacción
    return this.dataSource.transaction(async (manager) => {
      // Crear promoción
      const promocion = manager.create(Promocion, {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        aplica_todo: dto.aplica_todo ? 1 : 0,
        fecha_inicio: new Date(dto.fecha_inicio),
        fecha_fin: dto.fecha_fin ? new Date(dto.fecha_fin) : null,
        flg_acumulable: dto.flg_acumulable ? 1 : 0,
        flg_activo: dto.flg_activo !== false ? 1 : 0,
        user_crea_id: dto.user_crea_id || null,
      });

      const promocionGuardada = await manager.save(Promocion, promocion);

      // Crear reglas
      const reglas = dto.reglas.map((reglaDto) =>
        manager.create(PromocionRegla, {
          promocion_id: promocionGuardada.id,
          ...reglaDto,
        }),
      );
      await manager.save(PromocionRegla, reglas);

      // Crear alcances (si aplica)
      if (dto.alcances && dto.alcances.length > 0) {
        const alcances = dto.alcances.map((alcanceDto) =>
          manager.create(PromocionAlcance, {
            promocion_id: promocionGuardada.id,
            ...alcanceDto,
          }),
        );
        await manager.save(PromocionAlcance, alcances);
      }

      // Retornar promoción completa
      return this.findOne(promocionGuardada.id);
    });
  }

  /**
   * Actualizar promoción existente
   */
  async update(id: number, dto: UpdatePromocionDto) {
    await this.findOne(id);

    // Validar fechas
    if (dto.fecha_fin && dto.fecha_inicio) {
      if (new Date(dto.fecha_fin) < new Date(dto.fecha_inicio)) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha de inicio',
        );
      }
    }

    // Si aplica_todo pasa a false, debe haber alcances (nuevos o existentes)
    if (dto.aplica_todo === false) {
      const tieneNuevos = dto.alcances && dto.alcances.length > 0;
      if (!tieneNuevos) {
        const alcancesExistentes = await this.alcanceRepo.count({
          where: { promocion_id: id },
        });
        if (alcancesExistentes === 0) {
          throw new BadRequestException(
            'Si aplica_todo es false, debe especificar al menos un alcance',
          );
        }
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // Actualizar cabecera
      await manager.update(Promocion, id, {
        ...(dto.nombre && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.aplica_todo !== undefined && {
          aplica_todo: dto.aplica_todo ? 1 : 0,
        }),
        ...(dto.fecha_inicio && { fecha_inicio: new Date(dto.fecha_inicio) }),
        ...(dto.fecha_fin !== undefined && {
          fecha_fin: dto.fecha_fin ? new Date(dto.fecha_fin) : null,
        }),
        ...(dto.flg_acumulable !== undefined && {
          flg_acumulable: dto.flg_acumulable ? 1 : 0,
        }),
        ...(dto.flg_activo !== undefined && {
          flg_activo: dto.flg_activo ? 1 : 0,
        }),
        user_actua_id: dto.user_actua_id || null,
      });

      // Actualizar reglas si se especificaron
      if (dto.reglas && dto.reglas.length > 0) {
        await manager.delete(PromocionRegla, { promocion_id: id });
        const reglas = dto.reglas.map((reglaDto) =>
          manager.create(PromocionRegla, { promocion_id: id, ...reglaDto }),
        );
        await manager.save(PromocionRegla, reglas);
      }

      // Actualizar alcances:
      // - aplica_todo=true  → borrar todos los alcances existentes
      // - alcances=[items]  → reemplazar con los nuevos
      // - alcances no viene → no tocar
      if (dto.aplica_todo === true) {
        await manager.delete(PromocionAlcance, { promocion_id: id });
      } else if (dto.alcances !== undefined) {
        await manager.delete(PromocionAlcance, { promocion_id: id });
        if (dto.alcances.length > 0) {
          const alcances = dto.alcances.map((alcanceDto) =>
            manager.create(PromocionAlcance, { promocion_id: id, ...alcanceDto }),
          );
          await manager.save(PromocionAlcance, alcances);
        }
      }

      return this.findOne(id);
    });
  }

  /**
   * Activar/Desactivar promoción
   */
  async toggleActivo(id: number, activo: boolean, userId?: number) {
    const promocion = await this.findOne(id);

    await this.promocionRepo.update(id, {
      flg_activo: activo ? 1 : 0,
      user_actua_id: userId || null,
    });

    return this.findOne(id);
  }

  /**
   * Eliminar promoción
   */
  async remove(id: number) {
    const promocion = await this.findOne(id);
    await this.promocionRepo.remove(promocion);
    return { message: `Promoción ${id} eliminada exitosamente` };
  }

  /**
   * Obtener promociones activas y vigentes
   */
  async getPromocionesVigentes(fecha?: Date) {
    return this.findAll({
      soloActivas: true,
      soloVigentes: true,
      fecha: fecha || new Date(),
    });
  }
}