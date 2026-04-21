import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Promocion } from '../entities/promocion.entity';
import { PromocionRegla } from '../entities/promocion-regla.entity';
import { PromocionAlcance } from '../entities/promocion-alcance.entity';
import { CreatePromocionDto } from '../dto/create-promocion.dto';
import { UpdatePromocionDto } from '../dto/update-promocion.dto';

// IDs de tipo_alcance_promo (según tabla BD)
const ALCANCE_PRODUCTO = 1;
const ALCANCE_CATEGORIA = 2;
const ALCANCE_SERVICIO = 3;
const ALCANCE_PAQUETE = 4;

/**
 * Parsea una fecha "YYYY-MM-DD" como fecha local sin conversión UTC.
 * Evita el problema de que new Date("2025-03-15") devuelva 2025-03-14
 * en zonas horarias con offset negativo (ej: Perú UTC-5).
 */
function parseFecha(fecha: string): Date {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // mediodía local, sin ambigüedad
}

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

  private async findOneWithManager(id: number, manager: any) {
    const promocion = await manager.findOne(Promocion, {
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
    if (!promocion) throw new NotFoundException(`Promoción ${id} no encontrada`);
    return promocion;
  }

  async findAll(filtros?: { soloActivas?: boolean; soloVigentes?: boolean; fecha?: Date }) {
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

    if (filtros?.soloActivas) qb.andWhere('p.flg_activo = 1');
    if (filtros?.soloVigentes) {
      const fecha = filtros.fecha || new Date();
      qb.andWhere('p.fecha_inicio <= :fecha', { fecha })
        .andWhere('(p.fecha_fin IS NULL OR p.fecha_fin >= :fecha)', { fecha });
    }

    return qb.getMany();
  }

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
    if (!promocion) throw new NotFoundException(`Promoción ${id} no encontrada`);
    return promocion;
  }

  /**
   * Devuelve el catálogo completo de items disponibles para definir alcances.
   * Retorna por separado: productos (con su categoría), categorías, servicios
   * (con sus motivos de cita activos) y paquetes.
   * El frontend lo usa para el selector visual de alcances.
   */
  async getCatalogoAlcances() {
    const db = this.dataSource;

    // Productos activos con su categoría
    const productos = await db.query(`
      SELECT
        p.id,
        p.nombre,
        p.precio_venta,
        p.stock_actual,
        c.id AS categoria_id,
        c.nombre AS categoria_nombre
      FROM producto p
      LEFT JOIN categoria_producto c ON c.id = p.categoria_id
      WHERE p.flg_activo = 1
      ORDER BY c.nombre, p.nombre
    `);

    // Categorías de productos que tienen al menos un producto activo
    const categorias = await db.query(`
      SELECT DISTINCT
        c.id,
        c.nombre,
        COUNT(p.id) AS total_productos
      FROM categoria_producto c
      INNER JOIN producto p ON p.categoria_id = c.id AND p.flg_activo = 1
      GROUP BY c.id, c.nombre
      ORDER BY c.nombre
    `);

    // Servicios activos con sus motivos de cita
    const servicios = await db.query(`
      SELECT
        s.id,
        s.nombre,
        mc.id AS motivo_cita_id,
        mc.nombre AS motivo_cita_nombre,
        st.precio
      FROM servicios s
      LEFT JOIN servicio_tarifa st ON st.servicio_id = s.id AND st.flg_activo = 1
      LEFT JOIN motivo_cita mc ON mc.id = st.motivo_cita_id
      WHERE s.activo = 1
      ORDER BY s.nombre, mc.nombre
    `);

    // Paquetes activos
    const paquetes = await db.query(`
      SELECT id, nombre, cantidad_sesiones AS cantidadSesiones
      FROM paquetes
      WHERE flg_activo = 1
      ORDER BY nombre
    `);

    // Agrupar servicios por servicio (con sus motivos como array)
    const serviciosAgrupados: Record<number, any> = {};
    for (const row of servicios) {
      if (!serviciosAgrupados[row.id]) {
        serviciosAgrupados[row.id] = {
          id: row.id,
          nombre: row.nombre,
          motivos: [],
        };
      }
      if (row.motivo_cita_id) {
        serviciosAgrupados[row.id].motivos.push({
          id: row.motivo_cita_id,
          nombre: row.motivo_cita_nombre,
          precio: row.precio,
        });
      }
    }

    return {
      productos,
      categorias,
      servicios: Object.values(serviciosAgrupados),
      paquetes,
    };
  }

  async create(dto: CreatePromocionDto) {
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

    // Validar coherencia: no mezclar productos y servicios en mismo alcance
    if (dto.alcances && dto.alcances.length > 0) {
      const tieneProductos = dto.alcances.some(
        (a) => a.tipo_alcance_id === ALCANCE_PRODUCTO || a.tipo_alcance_id === ALCANCE_CATEGORIA,
      );
      const tieneServicios = dto.alcances.some(
        (a) => a.tipo_alcance_id === ALCANCE_SERVICIO || a.tipo_alcance_id === ALCANCE_PAQUETE,
      );
      if (tieneProductos && tieneServicios) {
        throw new BadRequestException(
          'Una promoción no puede mezclar alcances de productos y servicios. Crea una promoción separada para cada tipo.',
        );
      }
    }

    if (dto.fecha_fin && parseFecha(dto.fecha_fin) < parseFecha(dto.fecha_inicio)) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    return this.dataSource.transaction(async (manager) => {
      const promocion = manager.create(Promocion, {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        aplica_todo: dto.aplica_todo ? 1 : 0,
        fecha_inicio: parseFecha(dto.fecha_inicio),
        fecha_fin: dto.fecha_fin ? parseFecha(dto.fecha_fin) : null,
        flg_acumulable: dto.flg_acumulable ? 1 : 0,
        flg_activo: dto.flg_activo !== false ? 1 : 0,
        user_crea_id: dto.user_crea_id || null,
      });

      const promocionGuardada = await manager.save(Promocion, promocion);

      const reglas = dto.reglas.map((r) =>
        manager.create(PromocionRegla, { promocion_id: promocionGuardada.id, ...r }),
      );
      await manager.save(PromocionRegla, reglas);

      if (dto.alcances && dto.alcances.length > 0) {
        const alcances = dto.alcances.map((a) =>
          manager.create(PromocionAlcance, { promocion_id: promocionGuardada.id, ...a }),
        );
        await manager.save(PromocionAlcance, alcances);
      }

      return this.findOneWithManager(promocionGuardada.id, manager);
    });
  }

  async update(id: number, dto: UpdatePromocionDto) {
    await this.findOne(id);

    if (dto.fecha_fin && dto.fecha_inicio) {
      if (parseFecha(dto.fecha_fin) < parseFecha(dto.fecha_inicio)) {
        throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
      }
    }

    // Validar coherencia de alcances si se envían
    if (dto.alcances && dto.alcances.length > 0) {
      const tieneProductos = dto.alcances.some(
        (a) => a.tipo_alcance_id === ALCANCE_PRODUCTO || a.tipo_alcance_id === ALCANCE_CATEGORIA,
      );
      const tieneServicios = dto.alcances.some(
        (a) => a.tipo_alcance_id === ALCANCE_SERVICIO || a.tipo_alcance_id === ALCANCE_PAQUETE,
      );
      if (tieneProductos && tieneServicios) {
        throw new BadRequestException(
          'Una promoción no puede mezclar alcances de productos y servicios.',
        );
      }
    }

    if (dto.aplica_todo === false) {
      const tieneNuevos = dto.alcances && dto.alcances.length > 0;
      if (!tieneNuevos) {
        const alcancesExistentes = await this.alcanceRepo.count({ where: { promocion_id: id } });
        if (alcancesExistentes === 0) {
          throw new BadRequestException('Si aplica_todo es false, debe especificar al menos un alcance');
        }
      }
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Promocion, id, {
        ...(dto.nombre && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.aplica_todo !== undefined && { aplica_todo: dto.aplica_todo ? 1 : 0 }),
        ...(dto.fecha_inicio && { fecha_inicio: parseFecha(dto.fecha_inicio) }),
        ...(dto.fecha_fin !== undefined && {
          fecha_fin: dto.fecha_fin ? parseFecha(dto.fecha_fin) : null,
        }),
        ...(dto.flg_acumulable !== undefined && { flg_acumulable: dto.flg_acumulable ? 1 : 0 }),
        ...(dto.flg_activo !== undefined && { flg_activo: dto.flg_activo ? 1 : 0 }),
        user_actua_id: dto.user_actua_id || null,
      });

      if (dto.reglas && dto.reglas.length > 0) {
        await manager.delete(PromocionRegla, { promocion_id: id });
        const reglas = dto.reglas.map((r) =>
          manager.create(PromocionRegla, { promocion_id: id, ...r }),
        );
        await manager.save(PromocionRegla, reglas);
      }

      if (dto.aplica_todo === true) {
        await manager.delete(PromocionAlcance, { promocion_id: id });
      } else if (dto.alcances !== undefined) {
        await manager.delete(PromocionAlcance, { promocion_id: id });
        if (dto.alcances.length > 0) {
          const alcances = dto.alcances.map((a) =>
            manager.create(PromocionAlcance, { promocion_id: id, ...a }),
          );
          await manager.save(PromocionAlcance, alcances);
        }
      }

      return this.findOneWithManager(id, manager);
    });
  }

  async toggleActivo(id: number, activo: boolean, userId?: number) {
    await this.findOne(id);
    await this.promocionRepo.update(id, {
      flg_activo: activo ? 1 : 0,
      user_actua_id: userId || null,
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    const promocion = await this.findOne(id);
    await this.promocionRepo.remove(promocion);
    return { message: `Promoción ${id} eliminada exitosamente` };
  }

  async getPromocionesVigentes(fecha?: Date) {
    return this.findAll({ soloActivas: true, soloVigentes: true, fecha: fecha || new Date() });
  }
}