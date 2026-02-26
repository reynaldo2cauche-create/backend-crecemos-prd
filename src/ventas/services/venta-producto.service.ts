import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VentaProducto } from '../entities/venta-producto.entity';
import { VentaProductoDetalle } from '../entities/venta-producto-detalle.entity';
import { CreateVentaProductoDto, DetalleVentaProductoDto } from '../dto/create-venta-producto.dto';
import { Producto } from '../../inventario/entities/producto.entity';

@Injectable()
export class VentaProductoService {
  constructor(
    @InjectRepository(VentaProducto)
    private readonly ventaRepo: Repository<VentaProducto>,
    @InjectRepository(VentaProductoDetalle)
    private readonly detalleRepo: Repository<VentaProductoDetalle>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filtros?: { desde?: string; hasta?: string }) {
    const qb = this.ventaRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.tipo_comprador', 'tipo_comprador')
      .leftJoinAndSelect('v.paciente', 'paciente')
      .leftJoinAndSelect('v.responsable', 'responsable')
      .leftJoinAndSelect('v.comprador_externo', 'comprador_externo')
      .leftJoinAndSelect('v.descuento_tipo', 'descuento_tipo')
      .leftJoinAndSelect('v.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .leftJoinAndSelect('detalles.descuento_tipo', 'detalle_descuento_tipo')
      .leftJoinAndSelect('v.tipo_comprobante', 'tipo_comprobante')
      .orderBy('v.created_at', 'DESC');

    if (filtros?.desde) qb.andWhere('v.fecha_venta >= :desde', { desde: filtros.desde });
    if (filtros?.hasta) qb.andWhere('v.fecha_venta <= :hasta', { hasta: filtros.hasta });

    return qb.getMany();
  }

  async findOne(id: number) {
    const v = await this.ventaRepo.findOne({
      where: { id },
      relations: [
        'tipo_comprador', 'paciente', 'responsable', 'comprador_externo',
        'descuento_tipo', 'detalles', 'detalles.producto', 'detalles.descuento_tipo',
      ],
    });
    if (!v) throw new NotFoundException(`Venta de producto ${id} no encontrada`);
    return v;
  }

  async create(dto: CreateVentaProductoDto) {
    return this.dataSource.transaction(async (manager) => {
      // Verificar stock suficiente para todos los productos
      for (const d of dto.detalles) {
        const prod = await manager.findOne(Producto, { where: { id: d.producto_id } });
        if (!prod) throw new NotFoundException(`Producto ${d.producto_id} no encontrado`);
        if (prod.stock_actual < d.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para "${prod.nombre}": disponible ${prod.stock_actual}, solicitado ${d.cantidad}`,
          );
        }
      }

      const detallesCalculados = dto.detalles.map((d) => this.calcularDetalle(d));
      const subtotal = detallesCalculados.reduce((s, d) => s + d.subtotal, 0);
      const descuentoGlobalMonto = this.calcularDescuentoMonto(subtotal, dto.descuento_tipo_id, dto.descuento_valor);
      const descuentoPromoMonto = parseFloat((dto.descuento_promocion ?? 0).toFixed(2));
      const descuentoMonto = parseFloat((descuentoGlobalMonto + descuentoPromoMonto).toFixed(2));
      const total = Math.max(0, parseFloat((subtotal - descuentoMonto).toFixed(2)));

      // 🆕 Generar código de comprobante
      const codigoComprobante = await this.generarCodigoComprobante(manager, dto.tipo_comprobante_id);

      const venta = manager.create(VentaProducto, {
        // FIX #1: el DTO usa tipo_comprador_id, no tipo_pagador_id
        tipo_comprador_id: dto.tipo_comprador_id,
        paciente_id: dto.paciente_id,
        responsable_id: dto.responsable_id,
        comprador_externo_id: dto.comprador_externo_id,
        fecha_venta: dto.fecha_venta,
        tipo_comprobante_id: dto.tipo_comprobante_id,
        codigo_comprobante: codigoComprobante,
        subtotal,
        descuento_tipo_id: dto.descuento_tipo_id,
        descuento_valor: dto.descuento_valor ?? 0,
        descuento_monto: descuentoMonto,
        total,
        nota: dto.nota,
        user_crea_id: dto.user_crea_id,
      });
      const savedVenta = await manager.save(venta);

      for (const d of detallesCalculados) {
        const detalle = manager.create(VentaProductoDetalle, {
          venta_id: savedVenta.id,
          producto_id: d.producto_id,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          descuento_tipo_id: d.descuento_tipo_id,
          descuento_valor: d.descuento_valor ?? 0,
          descuento_monto: d.descuento_monto,
          subtotal: d.subtotal,
        });
        await manager.save(detalle);

        // FIX #2: usar la clase Producto (no el string 'producto')
        // El string hace que TypeORM no resuelva el nombre real de la tabla
        await manager
          .createQueryBuilder()
          .update(Producto)
          .set({ stock_actual: () => `stock_actual - ${d.cantidad}` })
          .where('id = :id', { id: d.producto_id })
          .execute();
      }

      // FIX #3: usar el manager de la transacción para el findOne final,
      // igual que hace venta-servicio.service.ts — evita leer datos aún no commiteados
      return manager.findOne(VentaProducto, {
        where: { id: savedVenta.id },
        relations: [
          'tipo_comprador', 'paciente', 'responsable', 'comprador_externo',
          'descuento_tipo', 'detalles', 'detalles.producto', 'detalles.descuento_tipo',
        ],
      });
    });
  }

  // ── Helpers privados ─────────────────────────────────────────────────────────

  private calcularDetalle(d: DetalleVentaProductoDto) {
    const baseLinea = d.precio_unitario * d.cantidad;
    const descuentoMonto = this.calcularDescuentoMonto(baseLinea, d.descuento_tipo_id, d.descuento_valor);
    return {
      ...d,
      descuento_monto: descuentoMonto,
      subtotal: baseLinea - descuentoMonto,
    };
  }

  private calcularDescuentoMonto(base: number, tipoId?: number, valor?: number): number {
    if (!tipoId || !valor || valor <= 0) return 0;
    if (tipoId === 1) return parseFloat(((base * valor) / 100).toFixed(2));
    if (tipoId === 2) return Math.min(valor, base);
    return 0;
  }

  /**
   * Genera código de comprobante según tipo:
   * - Nota de Venta (1): NV-0001, NV-0002, ...
   * - Boleta (2):        B001-00001, B001-00002, ... (formato SUNAT)
   * - Factura (3):       F001-00001, F001-00002, ... (formato SUNAT)
   */
  private async generarCodigoComprobante(manager: any, tipoComprobanteId: number): Promise<string> {
    let prefijo: string;
    let padding: number;

    switch (tipoComprobanteId) {
      case 1: // Nota de Venta
        prefijo = 'NV-';
        padding = 4;
        break;
      case 2: // Boleta
        prefijo = 'B001-';
        padding = 5;
        break;
      case 3: // Factura
        prefijo = 'F001-';
        padding = 5;
        break;
      default:
        throw new BadRequestException(`Tipo de comprobante ${tipoComprobanteId} no válido`);
    }

    // Obtener el último código de este tipo (usando LIKE para el prefijo)
    const ultimaVenta = await manager
      .createQueryBuilder(VentaProducto, 'v')
      .where('v.codigo_comprobante LIKE :prefijo', { prefijo: `${prefijo}%` })
      .orderBy('v.id', 'DESC')
      .getOne();

    let siguienteNumero = 1;
    if (ultimaVenta?.codigo_comprobante) {
      // Extraer el número del código (ej: "NV-0001" -> 1, "B001-00001" -> 1)
      const partes = ultimaVenta.codigo_comprobante.split('-');
      const numeroActual = parseInt(partes[partes.length - 1], 10);
      if (!isNaN(numeroActual)) {
        siguienteNumero = numeroActual + 1;
      }
    }

    // Generar código con padding (ej: 1 -> "0001" o "00001")
    const numeroFormateado = siguienteNumero.toString().padStart(padding, '0');
    return `${prefijo}${numeroFormateado}`;
  }
}