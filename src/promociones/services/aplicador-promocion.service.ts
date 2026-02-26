import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promocion } from '../entities/promocion.entity';
import { PromocionAlcance } from '../entities/promocion-alcance.entity';
import { VentaPromocionAplicada } from '../entities/venta-promocion-aplicada.entity';
import { AplicarPromocionDto, ItemVentaDto } from '../dto/aplicar-promocion.dto';

// Tipos de condición
const CONDICION_CANTIDAD_MINIMA = 1;
const CONDICION_MONTO_MINIMO = 2;

// Tipos de beneficio
const BENEFICIO_DESCUENTO_PORCENTAJE = 1;
const BENEFICIO_DESCUENTO_MONTO_FIJO = 2;
const BENEFICIO_ITEM_BARATO_GRATIS = 3;
const BENEFICIO_PRODUCTO_REGALO = 4;

// Tipos de alcance
const ALCANCE_PRODUCTO = 1;
const ALCANCE_CATEGORIA = 2;
const ALCANCE_SERVICIO = 3;
const ALCANCE_PAQUETE = 4;

export interface PromocionAplicable {
  promocion: Promocion;
  itemsAplicables: ItemVentaDto[];
  descuento: number;
  mensaje: string;
}

@Injectable()
export class AplicadorPromocionService {
  constructor(
    @InjectRepository(Promocion)
    private readonly promocionRepo: Repository<Promocion>,
    @InjectRepository(PromocionAlcance)
    private readonly alcanceRepo: Repository<PromocionAlcance>,
    @InjectRepository(VentaPromocionAplicada)
    private readonly ventaPromoRepo: Repository<VentaPromocionAplicada>,
  ) {}

  /**
   * Calcular promociones aplicables a un carrito de compra
   */
  async calcularPromociones(dto: AplicarPromocionDto): Promise<{
    promociones_aplicadas: PromocionAplicable[];
    total_descuento: number;
    items_actualizados: ItemVentaDto[];
  }> {
    // Obtener promociones vigentes y activas
    const hoy = new Date();
    const promociones = await this.promocionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.reglas', 'reglas')
      .leftJoinAndSelect('reglas.condicion_tipo', 'condicion_tipo')
      .leftJoinAndSelect('reglas.beneficio_tipo', 'beneficio_tipo')
      .leftJoinAndSelect('reglas.beneficio_producto', 'beneficio_producto')
      .leftJoinAndSelect('p.alcances', 'alcances')
      .where('p.flg_activo = 1')
      .andWhere('p.fecha_inicio <= :hoy', { hoy })
      .andWhere('(p.fecha_fin IS NULL OR p.fecha_fin >= :hoy)', { hoy })
      .getMany();

    // Filtrar promociones excluidas
    const promocionesValidas = promociones.filter(
      (p) => !dto.promociones_excluidas?.includes(p.id),
    );

    const promocionesAplicadas: PromocionAplicable[] = [];
    let itemsConDescuento = [...dto.items];

    // Evaluar cada promoción
    for (const promocion of promocionesValidas) {
      const resultado = await this.evaluarPromocion(
        promocion,
        itemsConDescuento,
        promocionesAplicadas,
      );

      if (resultado) {
        promocionesAplicadas.push(resultado);
        itemsConDescuento = this.aplicarDescuentoAItems(
          itemsConDescuento,
          resultado,
        );

        // Si no es acumulable, detener evaluación
        if (promocion.flg_acumulable === 0) {
          break;
        }
      }
    }

    // Calcular total de descuentos
    const totalDescuento = promocionesAplicadas.reduce(
      (sum, p) => sum + p.descuento,
      0,
    );

    return {
      promociones_aplicadas: promocionesAplicadas,
      total_descuento: totalDescuento,
      items_actualizados: itemsConDescuento,
    };
  }

  /**
   * Evaluar si una promoción es aplicable
   */
  private async evaluarPromocion(
    promocion: Promocion,
    items: ItemVentaDto[],
    promocionesYaAplicadas: PromocionAplicable[],
  ): Promise<PromocionAplicable | null> {
    // Filtrar items aplicables según alcance
    const itemsAplicables = await this.filtrarItemsAplicables(promocion, items);

    if (itemsAplicables.length === 0) {
      return null;
    }

    // Evaluar cada regla de la promoción
    for (const regla of promocion.reglas) {
      // Verificar condición
      const cumpleCondicion = this.verificarCondicion(
        regla.condicion_tipo_id,
        regla.condicion_valor,
        itemsAplicables,
      );

      if (!cumpleCondicion) {
        continue;
      }

      // Calcular beneficio
      const descuento = this.calcularBeneficio(
        regla.beneficio_tipo_id,
        regla.beneficio_valor,
        itemsAplicables,
      );

      if (descuento > 0) {
        return {
          promocion,
          itemsAplicables,
          descuento,
          mensaje: this.generarMensaje(promocion, regla, descuento),
        };
      }
    }

    return null;
  }

  /**
   * Filtrar items según el alcance de la promoción
   */
  private async filtrarItemsAplicables(
    promocion: Promocion,
    items: ItemVentaDto[],
  ): Promise<ItemVentaDto[]> {
    // Si aplica a todo, retornar todos los items
    if (promocion.aplica_todo === 1) {
      return items;
    }

    // Obtener alcances de la promoción
    const alcances = promocion.alcances || [];

    if (alcances.length === 0) {
      return [];
    }

    // Filtrar items según alcances
    return items.filter((item) => {
      return alcances.some((alcance) => {
        switch (alcance.tipo_alcance_id) {
          case ALCANCE_PRODUCTO:
            return item.producto_id === alcance.referencia_id;

          case ALCANCE_CATEGORIA:
            return item.categoria_id === alcance.referencia_id;

          case ALCANCE_SERVICIO:
            if (item.servicio_id !== alcance.referencia_id) {
              return false;
            }
            // Si especifica motivo_cita, validar
            if (alcance.motivo_cita_id !== null) {
              return item.motivo_cita_id === alcance.motivo_cita_id;
            }
            return true;

          case ALCANCE_PAQUETE:
            return item.paquete_id === alcance.referencia_id;

          default:
            return false;
        }
      });
    });
  }

  /**
   * Verificar si se cumple la condición de la promoción
   */
  private verificarCondicion(
    condicionTipoId: number,
    condicionValor: number,
    items: ItemVentaDto[],
  ): boolean {
    switch (condicionTipoId) {
      case CONDICION_CANTIDAD_MINIMA: {
        const cantidadTotal = items.reduce(
          (sum, item) => sum + item.cantidad,
          0,
        );
        return cantidadTotal >= condicionValor;
      }

      case CONDICION_MONTO_MINIMO: {
        const montoTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        return montoTotal >= condicionValor;
      }

      default:
        return false;
    }
  }

  /**
   * Calcular el beneficio (descuento) de la promoción
   */
  private calcularBeneficio(
    beneficioTipoId: number,
    beneficioValor: number,
    items: ItemVentaDto[],
  ): number {
    switch (beneficioTipoId) {
      case BENEFICIO_DESCUENTO_PORCENTAJE: {
        const montoTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        return (montoTotal * beneficioValor) / 100;
      }

      case BENEFICIO_DESCUENTO_MONTO_FIJO: {
        return beneficioValor;
      }

      case BENEFICIO_ITEM_BARATO_GRATIS: {
        // Encontrar el item más barato
        const itemMasBarato = items.reduce((min, item) =>
          item.precio_unitario < min.precio_unitario ? item : min,
        );
        return itemMasBarato.precio_unitario;
      }

      case BENEFICIO_PRODUCTO_REGALO: {
        // Este tipo de beneficio no genera descuento monetario directo
        // Se debe agregar el producto como regalo (cantidad = 1, precio = 0)
        return 0;
      }

      default:
        return 0;
    }
  }

  /**
   * Aplicar descuento a los items
   */
  private aplicarDescuentoAItems(
    items: ItemVentaDto[],
    promocion: PromocionAplicable,
  ): ItemVentaDto[] {
    const descuentoPorItem =
      promocion.descuento / promocion.itemsAplicables.length;

    return items.map((item) => {
      const esAplicable = promocion.itemsAplicables.some(
        (i) =>
          i.producto_id === item.producto_id &&
          i.servicio_id === item.servicio_id,
      );

      if (esAplicable) {
        return {
          ...item,
          subtotal: Math.max(0, item.subtotal - descuentoPorItem),
        };
      }

      return item;
    });
  }

  /**
   * Generar mensaje descriptivo de la promoción aplicada
   */
  private generarMensaje(
    promocion: Promocion,
    regla: any,
    descuento: number,
  ): string {
    const beneficio = regla.beneficio_tipo.nombre;
    return `${promocion.nombre}: S/ ${descuento.toFixed(2)} de descuento`;
  }

  /**
   * Registrar promoción aplicada en una venta
   */
  async registrarPromocionAplicada(
    promocionId: number,
    tipoVentaId: number,
    ventaId: number,
    montoAhorrado: number,
  ): Promise<VentaPromocionAplicada> {
    const registro = this.ventaPromoRepo.create({
      promocion_id: promocionId,
      tipo_venta_id: tipoVentaId,
      venta_id: ventaId,
      monto_ahorrado: montoAhorrado,
    });

    return this.ventaPromoRepo.save(registro);
  }

  /**
   * Obtener historial de promociones aplicadas a una venta
   */
  async getPromocionesPorVenta(
    tipoVentaId: number,
    ventaId: number,
  ): Promise<VentaPromocionAplicada[]> {
    return this.ventaPromoRepo.find({
      where: {
        tipo_venta_id: tipoVentaId,
        venta_id: ventaId,
      },
      relations: ['promocion', 'tipo_venta'],
    });
  }

  /**
   * Obtener estadísticas de uso de promociones
   */
  async getEstadisticasPromociones(promocionId?: number) {
    const qb = this.ventaPromoRepo
      .createQueryBuilder('vpa')
      .select('vpa.promocion_id', 'promocion_id')
      .addSelect('COUNT(*)', 'total_usos')
      .addSelect('SUM(vpa.monto_ahorrado)', 'ahorro_total')
      .leftJoin('vpa.promocion', 'promocion')
      .addSelect('promocion.nombre', 'nombre_promocion')
      .groupBy('vpa.promocion_id');

    if (promocionId) {
      qb.where('vpa.promocion_id = :promocionId', { promocionId });
    }

    return qb.getRawMany();
  }
}
