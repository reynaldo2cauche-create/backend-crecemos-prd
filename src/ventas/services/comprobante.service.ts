// src/ventas/services/comprobante.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { VentaProducto } from '../entities/venta-producto.entity';
import { VentaServicio } from '../entities/venta-servicio.entity';

const CONFIGS: Record<number, { prefijo: string; padding: number }> = {
  1: { prefijo: 'NV-',   padding: 4 },
  2: { prefijo: 'B001-', padding: 5 },
  3: { prefijo: 'F001-', padding: 5 },
};

@Injectable()
export class ComprobanteService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Genera el siguiente código de comprobante único,
   * consultando AMBAS tablas (productos y servicios) para evitar duplicados.
   */
  async generarCodigo(
    manager: EntityManager,
    tipoComprobanteId: number,
  ): Promise<string> {
    const config = CONFIGS[tipoComprobanteId];
    if (!config) {
      throw new BadRequestException(
        `Tipo de comprobante ${tipoComprobanteId} no válido`,
      );
    }

    const { prefijo, padding } = config;
    const like = `${prefijo}%`;

    const [ultimoProducto, ultimoServicio] = await Promise.all([
      manager
        .createQueryBuilder(VentaProducto, 'v')
        .select('v.codigo_comprobante', 'codigo')
        .where('v.codigo_comprobante LIKE :like', { like })
        .orderBy('v.id', 'DESC')
        .getRawOne<{ codigo: string }>(),

      manager
        .createQueryBuilder(VentaServicio, 'v')
        .select('v.codigo_comprobante', 'codigo')
        .where('v.codigo_comprobante LIKE :like', { like })
        .orderBy('v.id', 'DESC')
        .getRawOne<{ codigo: string }>(),
    ]);

    const extraerNumero = (codigo?: string): number => {
      if (!codigo) return 0;
      const partes = codigo.split('-');
      const num = parseInt(partes[partes.length - 1], 10);
      return isNaN(num) ? 0 : num;
    };

    const mayor = Math.max(
      extraerNumero(ultimoProducto?.codigo),
      extraerNumero(ultimoServicio?.codigo),
    );

    return `${prefijo}${(mayor + 1).toString().padStart(padding, '0')}`;
  }
}