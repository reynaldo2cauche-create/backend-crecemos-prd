import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VentaProducto } from '../entities/venta-producto.entity';
import { VentaProductoDetalle } from '../entities/venta-producto-detalle.entity';
import { VentaProductoPago } from '../entities/venta-producto-pago.entity';
import { CreateVentaProductoDto, DetalleVentaProductoDto } from '../dto/create-venta-producto.dto';
import { UpdateVentaProductoDto } from '../dto/update-venta-producto.dto';
import { Producto } from '../../inventario/entities/producto.entity';
// ✅ FIX: importar el repositorio de promociones aplicadas
import { VentaPromocionAplicada } from '../../promociones/entities/venta-promocion-aplicada.entity';
import { ComprobanteService } from './comprobante.service';

const TIPO_VENTA_PRODUCTO = 1;

@Injectable()
export class VentaProductoService {
  constructor(
    @InjectRepository(VentaProducto)
    private readonly ventaRepo: Repository<VentaProducto>,
    @InjectRepository(VentaProductoDetalle)
    private readonly detalleRepo: Repository<VentaProductoDetalle>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    // ✅ FIX: inyectar el repositorio de VentaPromocionAplicada
    @InjectRepository(VentaPromocionAplicada)
    private readonly ventaPromoRepo: Repository<VentaPromocionAplicada>,
    @InjectRepository(VentaProductoPago)
    private readonly ventaPagoRepo: Repository<VentaProductoPago>,
    private readonly dataSource: DataSource,
    private readonly comprobanteService: ComprobanteService,
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
      .leftJoinAndSelect('v.modalidad_pago', 'modalidad_pago')
      .leftJoinAndSelect('v.pagos', 'pagos')
      .leftJoinAndSelect('pagos.modalidad_pago', 'pago_modalidad')
      .orderBy('v.created_at', 'DESC');

    if (filtros?.desde) qb.andWhere('v.fecha_venta >= :desde', { desde: filtros.desde });
    if (filtros?.hasta) qb.andWhere('v.fecha_venta <= :hasta', { hasta: filtros.hasta });

    const ventas = await qb.getMany();

    // ✅ FIX: cargar las promociones aplicadas para TODAS las ventas de una vez
    // (un solo query extra, no N queries — mucho más eficiente)
    if (ventas.length > 0) {
      const ventaIds = ventas.map((v) => v.id);
      const promociones = await this.ventaPromoRepo.find({
        where: ventaIds.map((id) => ({ tipo_venta_id: TIPO_VENTA_PRODUCTO, venta_id: id })),
        relations: ['promocion', 'promocion.reglas', 'promocion.reglas.beneficio_producto'],
      });

      // Agrupar por venta_id y asignar
      const promosPorVenta = new Map<number, VentaPromocionAplicada[]>();
      for (const p of promociones) {
        if (!promosPorVenta.has(p.venta_id)) {
          promosPorVenta.set(p.venta_id, []);
        }
        promosPorVenta.get(p.venta_id).push(p);
      }

      for (const venta of ventas) {
        venta.promociones_aplicadas = promosPorVenta.get(venta.id) ?? [];
      }
    }

    return ventas;
  }

  async findOne(id: number) {
    const v = await this.ventaRepo.findOne({
      where: { id },
      relations: [
        'tipo_comprador', 'paciente', 'responsable', 'comprador_externo',
        'descuento_tipo', 'detalles', 'detalles.producto', 'detalles.descuento_tipo',
        'tipo_comprobante', 'modalidad_pago', 'pagos', 'pagos.modalidad_pago',
      ],
    });
    if (!v) throw new NotFoundException(`Venta de producto ${id} no encontrada`);

    // ✅ FIX: cargar promociones aplicadas para este findOne también
    v.promociones_aplicadas = await this.ventaPromoRepo.find({
      where: { tipo_venta_id: TIPO_VENTA_PRODUCTO, venta_id: id },
      relations: ['promocion', 'promocion.reglas', 'promocion.reglas.beneficio_producto'],
    });

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
      const descuentoPromoMonto = parseFloat((Number(dto.descuento_promocion ?? 0)).toFixed(2));
      const descuentoMonto = parseFloat((descuentoGlobalMonto + descuentoPromoMonto).toFixed(2));
      const total = Math.max(0, parseFloat((subtotal - descuentoMonto).toFixed(2)));

      const codigoComprobante = await this.comprobanteService.generarCodigo(manager, dto.tipo_comprobante_id);

      const venta = manager.create(VentaProducto, {
        tipo_comprador_id: Number(dto.tipo_comprador_id),
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
        descuento_promocion: descuentoPromoMonto,
        total,
        nota: dto.nota,
        observaciones: dto.observaciones,
        modalidad_pago_id:      dto.modalidad_pago_id ?? null,
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

        await manager
          .createQueryBuilder()
          .update(Producto)
          .set({ stock_actual: () => `stock_actual - ${d.cantidad}` })
          .where('id = :id', { id: d.producto_id })
          .execute();
      }

      // Guardar pagos múltiples
      if (dto.pagos && dto.pagos.length > 0) {
        for (const p of dto.pagos) {
          const pago = manager.create(VentaProductoPago, {
            venta_id: savedVenta.id,
            modalidad_pago_id: p.modalidad_pago_id,
            monto: p.monto,
            referencia: p.referencia ?? null,
          });
          await manager.save(pago);
        }
      }

      const ventaCompleta = await manager.findOne(VentaProducto, {
        where: { id: savedVenta.id },
        relations: [
          'tipo_comprador', 'paciente', 'responsable', 'comprador_externo',
          'descuento_tipo', 'detalles', 'detalles.producto', 'detalles.descuento_tipo',
          'tipo_comprobante', 'modalidad_pago', 'pagos', 'pagos.modalidad_pago',
        ],
      });

      ventaCompleta.promociones_aplicadas = [];

      return ventaCompleta;
    });
  }

  /** Actualiza campos editables de una venta de producto */
  async update(id: number, dto: UpdateVentaProductoDto) {
    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['detalles']
    });
    if (!venta) throw new NotFoundException(`Venta de producto ${id} no encontrada`);

    return this.dataSource.transaction(async (manager) => {
      let subtotalFinal = venta.subtotal;

      // Si se envían detalles, reemplazar completamente
      if (dto.detalles && dto.detalles.length > 0) {
        // Devolver stock de los detalles antiguos
        for (const detalleAntiguo of venta.detalles) {
          await manager
            .createQueryBuilder()
            .update(Producto)
            .set({ stock_actual: () => `stock_actual + ${detalleAntiguo.cantidad}` })
            .where('id = :id', { id: detalleAntiguo.producto_id })
            .execute();
        }

        // Eliminar detalles antiguos
        await manager.delete(VentaProductoDetalle, { venta_id: id });

        // Verificar stock suficiente para los nuevos productos
        for (const d of dto.detalles) {
          const prod = await manager.findOne(Producto, { where: { id: d.producto_id } });
          if (!prod) throw new NotFoundException(`Producto ${d.producto_id} no encontrado`);
          if (prod.stock_actual < d.cantidad) {
            throw new BadRequestException(
              `Stock insuficiente para "${prod.nombre}": disponible ${prod.stock_actual}, solicitado ${d.cantidad}`,
            );
          }
        }

        // Calcular nuevos detalles
        const detallesCalculados = dto.detalles.map((d) => this.calcularDetalle(d));
        subtotalFinal = detallesCalculados.reduce((s, d) => s + d.subtotal, 0);

        // Guardar nuevos detalles y descontar stock
        for (const d of detallesCalculados) {
          const detalle = manager.create(VentaProductoDetalle, {
            venta_id: id,
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            descuento_tipo_id: d.descuento_tipo_id,
            descuento_valor: d.descuento_valor ?? 0,
            descuento_monto: d.descuento_monto,
            subtotal: d.subtotal,
          });
          await manager.save(detalle);

          await manager
            .createQueryBuilder()
            .update(Producto)
            .set({ stock_actual: () => `stock_actual - ${d.cantidad}` })
            .where('id = :id', { id: d.producto_id })
            .execute();
        }
      }

      // Actualizar campos de la venta
      const camposActualizables: Partial<VentaProducto> = {};

      if (dto.fecha_venta !== undefined) camposActualizables.fecha_venta = dto.fecha_venta;
      if (dto.tipo_pagador_id !== undefined) camposActualizables.tipo_comprador_id = dto.tipo_pagador_id;
      if (dto.paciente_id !== undefined) camposActualizables.paciente_id = dto.paciente_id;
      if (dto.responsable_id !== undefined) camposActualizables.responsable_id = dto.responsable_id;
      if (dto.comprador_externo_id !== undefined) camposActualizables.comprador_externo_id = dto.comprador_externo_id;
      if (dto.tipo_comprobante_id !== undefined) camposActualizables.tipo_comprobante_id = dto.tipo_comprobante_id;
      if (dto.nota !== undefined) camposActualizables.nota = dto.nota;
      if (dto.observaciones !== undefined) camposActualizables.observaciones = dto.observaciones;
      if (dto.modalidad_pago_id !== undefined) camposActualizables.modalidad_pago_id = dto.modalidad_pago_id;

      // Recalcular descuentos y totales
      const descuentoTipoId = dto.descuento_tipo_id ?? venta.descuento_tipo_id;
      const descuentoValor = dto.descuento_valor ?? venta.descuento_valor;
      const descuentoGlobalMonto = this.calcularDescuentoMonto(subtotalFinal, descuentoTipoId, descuentoValor);
      const descuentoPromoMonto = parseFloat((Number(venta.descuento_promocion ?? 0)).toFixed(2));
      const descuentoMonto = parseFloat((descuentoGlobalMonto + descuentoPromoMonto).toFixed(2));
      const total = Math.max(0, parseFloat((subtotalFinal - descuentoMonto).toFixed(2)));

      camposActualizables.subtotal = subtotalFinal;
      camposActualizables.descuento_tipo_id = descuentoTipoId;
      camposActualizables.descuento_valor = descuentoValor;
      camposActualizables.descuento_monto = descuentoMonto;
      camposActualizables.total = total;

      if (dto.user_actua_id !== undefined) {
        camposActualizables.user_actua_id = dto.user_actua_id;
      }

      await manager.update(VentaProducto, id, camposActualizables);

      // Reemplazar pagos si se envían
      if (dto.pagos && dto.pagos.length > 0) {
        await manager.delete(VentaProductoPago, { venta_id: id });
        for (const p of dto.pagos) {
          const pago = manager.create(VentaProductoPago, {
            venta_id: id,
            modalidad_pago_id: p.modalidad_pago_id,
            monto: p.monto,
            referencia: p.referencia ?? null,
          });
          await manager.save(pago);
        }
      }

      return this.findOne(id);
    });
  }

  /** Elimina una venta de producto y devuelve el stock a los productos */
  async remove(id: number) {
    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['detalles', 'detalles.producto']
    });
    if (!venta) throw new NotFoundException(`Venta de producto ${id} no encontrada`);

    return this.dataSource.transaction(async (manager) => {
      // Devolver stock a los productos
      for (const detalle of venta.detalles) {
        await manager
          .createQueryBuilder()
          .update(Producto)
          .set({ stock_actual: () => `stock_actual + ${detalle.cantidad}` })
          .where('id = :id', { id: detalle.producto_id })
          .execute();
      }

      // Eliminar promociones aplicadas
      await manager.delete(VentaPromocionAplicada, {
        tipo_venta_id: TIPO_VENTA_PRODUCTO,
        venta_id: id
      });

      // Eliminar detalles
      await manager.delete(VentaProductoDetalle, { venta_id: id });

      // Eliminar venta
      await manager.delete(VentaProducto, id);

      return { message: 'Venta de producto eliminada exitosamente', id };
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


}