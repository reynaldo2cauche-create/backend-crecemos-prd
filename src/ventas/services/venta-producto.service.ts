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
      const descuentoMonto = this.calcularDescuentoMonto(subtotal, dto.descuento_tipo_id, dto.descuento_valor);
      const total = subtotal - descuentoMonto;

      const venta = manager.create(VentaProducto, {
        tipo_comprador_id: dto.tipo_comprador_id,
        paciente_id: dto.paciente_id,
        responsable_id: dto.responsable_id,
        comprador_externo_id: dto.comprador_externo_id,
        fecha_venta: dto.fecha_venta,
        tipo_comprobante_id: dto.tipo_comprobante_id,
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

        // Decrementar stock
        await manager
          .createQueryBuilder()
          .update('producto')
          .set({ stock_actual: () => `stock_actual - ${d.cantidad}` })
          .where('id = :id', { id: d.producto_id })
          .execute();
      }

      return this.findOne(savedVenta.id);
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
