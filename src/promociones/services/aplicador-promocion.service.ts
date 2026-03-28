import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promocion } from '../entities/promocion.entity';
import { PromocionAlcance } from '../entities/promocion-alcance.entity';
import { VentaPromocionAplicada } from '../entities/venta-promocion-aplicada.entity';
import { AplicarPromocionDto, ItemVentaDto } from '../dto/aplicar-promocion.dto';

const CONDICION_CANTIDAD_MINIMA = 1;
const CONDICION_MONTO_MINIMO = 2;

const BENEFICIO_DESCUENTO_PORCENTAJE = 1;
const BENEFICIO_DESCUENTO_MONTO_FIJO = 2;
const BENEFICIO_ITEM_BARATO_GRATIS = 3;
const BENEFICIO_PRODUCTO_REGALO = 4;

const ALCANCE_PRODUCTO = 1;
const ALCANCE_CATEGORIA = 2;
const ALCANCE_SERVICIO = 3;
const ALCANCE_PAQUETE = 4;

export interface ProductoRegalo {
  producto_id: number;
  nombre: string;
  precio_unitario: number;
}

export interface PromocionAplicable {
  promocion: Promocion;
  itemsAplicables: ItemVentaDto[];
  descuento: number;
  mensaje: string;
  producto_regalo?: ProductoRegalo | null;
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

  async calcularPromociones(dto: AplicarPromocionDto): Promise<{
    promociones_aplicadas: PromocionAplicable[];
    total_descuento: number;
    items_actualizados: ItemVentaDto[];
  }> {
    const hoy = new Date();
    const promociones = await this.promocionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.reglas', 'reglas')
      .leftJoinAndSelect('reglas.condicion_tipo', 'condicion_tipo')
      .leftJoinAndSelect('reglas.beneficio_tipo', 'beneficio_tipo')
      // ✅ FIX: cargar precio_venta del producto regalo junto con el join
      .leftJoinAndSelect('reglas.beneficio_producto', 'beneficio_producto')
      .leftJoinAndSelect('p.alcances', 'alcances')
      .where('p.flg_activo = 1')
      .andWhere('p.fecha_inicio <= :hoy', { hoy })
      .andWhere('(p.fecha_fin IS NULL OR p.fecha_fin >= :hoy)', { hoy })
      .getMany();

    const promocionesValidas = promociones.filter(
      (p) => !dto.promociones_excluidas?.includes(p.id),
    );

    const promocionesAplicadas: PromocionAplicable[] = [];
    let itemsConDescuento = [...dto.items];

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

        if (promocion.flg_acumulable === 0) {
          break;
        }
      }
    }

    // ✅ FIX: total_descuento solo suma descuentos MONETARIOS, no regalos
    const totalDescuento = promocionesAplicadas.reduce(
      (sum, p) => sum + (p.producto_regalo ? 0 : p.descuento),
      0,
    );

    return {
      promociones_aplicadas: promocionesAplicadas,
      total_descuento: totalDescuento,
      items_actualizados: itemsConDescuento,
    };
  }

  private async evaluarPromocion(
    promocion: Promocion,
    items: ItemVentaDto[],
    promocionesYaAplicadas: PromocionAplicable[],
  ): Promise<PromocionAplicable | null> {
    const itemsAplicables = await this.filtrarItemsAplicables(promocion, items);

    if (itemsAplicables.length === 0) {
      return null;
    }

    for (const regla of promocion.reglas) {
      const cumpleCondicion = this.verificarCondicion(
        regla.condicion_tipo_id,
        regla.condicion_valor,
        itemsAplicables,
      );

      if (!cumpleCondicion) {
        continue;
      }

      // ✅ FIX: caso regalo separado completamente, con fallback a precio_venta del producto
      if (regla.beneficio_tipo_id === BENEFICIO_PRODUCTO_REGALO) {
        if (!regla.beneficio_producto) continue;

        // beneficio_valor tiene el precio si se configuró explícito,
        // si no, usar precio_venta del producto
        const precioRegalo = parseFloat(
          String(
            regla.beneficio_valor != null && regla.beneficio_valor > 0
              ? regla.beneficio_valor
              : regla.beneficio_producto.precio_venta ?? 0,
          ),
        );

        const productoRegalo: ProductoRegalo = {
          producto_id: regla.beneficio_producto.id,
          nombre: regla.beneficio_producto.nombre,
          precio_unitario: precioRegalo,
        };

        return {
          promocion,
          itemsAplicables,
          descuento: 0, // ✅ NO resta del total monetario — el regalo es línea aparte gratis
          mensaje: `${promocion.nombre}: ¡Te regalamos ${productoRegalo.nombre}!`,
          producto_regalo: productoRegalo,
        };
      }

      // Descuentos monetarios normales
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
          mensaje: this.generarMensaje(promocion, regla, descuento, null),
          producto_regalo: null,
        };
      }
    }

    return null;
  }

  private async filtrarItemsAplicables(
    promocion: Promocion,
    items: ItemVentaDto[],
  ): Promise<ItemVentaDto[]> {
    if (promocion.aplica_todo === 1) {
      return items;
    }

    const alcances = promocion.alcances || [];

    if (alcances.length === 0) {
      return [];
    }

    return items.filter((item) => {
      return alcances.some((alcance) => {
        switch (alcance.tipo_alcance_id) {
          case ALCANCE_PRODUCTO:
            return item.producto_id === alcance.referencia_id;
          case ALCANCE_CATEGORIA:
            return item.categoria_id === alcance.referencia_id;
          case ALCANCE_SERVICIO:
            if (item.servicio_id !== alcance.referencia_id) return false;
            if (alcance.motivo_cita_id !== null) return item.motivo_cita_id === alcance.motivo_cita_id;
            return true;
          case ALCANCE_PAQUETE:
            return item.paquete_id === alcance.referencia_id;
          default:
            return false;
        }
      });
    });
  }

  private verificarCondicion(
    condicionTipoId: number,
    condicionValor: number,
    items: ItemVentaDto[],
  ): boolean {
    switch (condicionTipoId) {
      case CONDICION_CANTIDAD_MINIMA: {
        const cantidadTotal = items.reduce((sum, item) => sum + item.cantidad, 0);
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
        const itemMasBarato = items.reduce((min, item) =>
          item.precio_unitario < min.precio_unitario ? item : min,
        );
        return itemMasBarato.precio_unitario;
      }
      case BENEFICIO_PRODUCTO_REGALO: {
        return 0; // manejado arriba en evaluarPromocion
      }
      default:
        return 0;
    }
  }

  private aplicarDescuentoAItems(
    items: ItemVentaDto[],
    promocion: PromocionAplicable,
  ): ItemVentaDto[] {
    // Si es regalo, no modificar items existentes
    if (promocion.producto_regalo) return items;

    const descuentoPorItem = promocion.descuento / promocion.itemsAplicables.length;

    return items.map((item) => {
      const esAplicable = promocion.itemsAplicables.some(
        (i) =>
          i.producto_id === item.producto_id &&
          i.servicio_id === item.servicio_id,
      );
      if (esAplicable) {
        return { ...item, subtotal: Math.max(0, item.subtotal - descuentoPorItem) };
      }
      return item;
    });
  }

  private generarMensaje(
    promocion: Promocion,
    regla: any,
    descuento: number,
    productoRegalo?: ProductoRegalo | null,
  ): string {
    if (productoRegalo) {
      return `${promocion.nombre}: ¡Te regalamos ${productoRegalo.nombre}!`;
    }
    return `${promocion.nombre}: S/ ${descuento.toFixed(2)} de descuento`;
  }

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

  async getPromocionesPorVenta(
    tipoVentaId: number,
    ventaId: number,
  ): Promise<VentaPromocionAplicada[]> {
    return this.ventaPromoRepo.find({
      where: { tipo_venta_id: tipoVentaId, venta_id: ventaId },
      relations: ['promocion', 'tipo_venta'],
    });
  }

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