import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VentaServicio } from '../entities/venta-servicio.entity';
import { VentaServicioDetalle } from '../entities/venta-servicio-detalle.entity';
import { CreateVentaServicioDto, DetalleVentaServicioDto } from '../dto/create-venta-servicio.dto';
// ✅ FIX: importar el repositorio de promociones aplicadas
import { VentaPromocionAplicada } from '../../promociones/entities/venta-promocion-aplicada.entity';

const TIPO_VENTA_SERVICIO = 2;

@Injectable()
export class VentaServicioService {
  constructor(
    @InjectRepository(VentaServicio)
    private readonly ventaRepo: Repository<VentaServicio>,
    @InjectRepository(VentaServicioDetalle)
    private readonly detalleRepo: Repository<VentaServicioDetalle>,
    // ✅ FIX: inyectar el repositorio de VentaPromocionAplicada
    @InjectRepository(VentaPromocionAplicada)
    private readonly ventaPromoRepo: Repository<VentaPromocionAplicada>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filtros?: { pacienteId?: number; desde?: string; hasta?: string }) {
    const qb = this.ventaRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.tipo_pagador', 'tipo_pagador')
      .leftJoinAndSelect('v.paciente', 'paciente')
      .leftJoinAndSelect('v.responsable', 'responsable')
      .leftJoinAndSelect('v.comprador_externo', 'comprador_externo')
      .leftJoinAndSelect('v.descuento_tipo', 'descuento_tipo')
      .leftJoinAndSelect('v.detalles', 'detalles')
      .leftJoinAndSelect('detalles.servicio', 'servicio')
      .leftJoinAndSelect('detalles.tipo_venta', 'tipo_venta')
      .leftJoinAndSelect('detalles.paquete', 'paquete')
      .leftJoinAndSelect('detalles.descuento_tipo', 'detalle_descuento_tipo')
      .leftJoinAndSelect('detalles.paciente', 'detalle_paciente')
      .leftJoinAndSelect('v.tipo_comprobante', 'tipo_comprobante')
      .orderBy('v.created_at', 'DESC');

    if (filtros?.pacienteId) {
      qb.andWhere('v.paciente_id = :pid', { pid: filtros.pacienteId });
    }
    if (filtros?.desde) {
      qb.andWhere('v.fecha_venta >= :desde', { desde: filtros.desde });
    }
    if (filtros?.hasta) {
      qb.andWhere('v.fecha_venta <= :hasta', { hasta: filtros.hasta });
    }

    const ventas = await qb.getMany();

    // ✅ FIX: cargar las promociones aplicadas para TODAS las ventas de una vez
    if (ventas.length > 0) {
      const ventaIds = ventas.map((v) => v.id);
      const promociones = await this.ventaPromoRepo.find({
        where: ventaIds.map((id) => ({ tipo_venta_id: TIPO_VENTA_SERVICIO, venta_id: id })),
        relations: ['promocion'],
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
        'tipo_pagador', 'paciente', 'responsable', 'comprador_externo',
        'descuento_tipo', 'detalles', 'detalles.servicio', 'detalles.tipo_venta',
        'detalles.paquete', 'detalles.descuento_tipo', 'detalles.paciente',
        'tipo_comprobante',
      ],
    });
    if (!v) throw new NotFoundException(`Venta de servicio ${id} no encontrada`);

    // ✅ FIX: cargar promociones aplicadas para este findOne también
    v.promociones_aplicadas = await this.ventaPromoRepo.find({
      where: { tipo_venta_id: TIPO_VENTA_SERVICIO, venta_id: id },
      relations: ['promocion'],
    });

    return v;
  }

  /** Ventas de servicio activas para un paciente (sesiones pendientes) */
  async findPendientesPorPaciente(pacienteId: number) {
    return this.detalleRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.venta', 'venta')
      .leftJoinAndSelect('d.servicio', 'servicio')
      .leftJoinAndSelect('d.tipo_venta', 'tipo_venta')
      .where('d.paciente_id = :pacienteId', { pacienteId })
      .andWhere('d.sesiones_usadas < d.sesiones_totales')
      .getMany();
  }

  async create(dto: CreateVentaServicioDto) {
    return this.dataSource.transaction(async (manager) => {
      const detallesCalculados = dto.detalles.map((d) =>
        this.calcularDetalle(d),
      );

      const subtotal = detallesCalculados.reduce((s, d) => s + d.subtotal, 0);
      const descuentoGlobalMonto = this.calcularDescuentoMonto(
        subtotal,
        dto.descuento_tipo_id,
        dto.descuento_valor,
      );
      const descuentoPromoMonto = parseFloat((dto.descuento_promocion ?? 0).toFixed(2));
      const descuentoMonto = parseFloat((descuentoGlobalMonto + descuentoPromoMonto).toFixed(2));
      const total = Math.max(0, parseFloat((subtotal - descuentoMonto).toFixed(2)));

      const codigoComprobante = await this.generarCodigoComprobante(manager, dto.tipo_comprobante_id);

      const venta = manager.create(VentaServicio, {
        tipo_pagador_id: dto.tipo_pagador_id,
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
        user_crea_id: dto.user_crea_id,
      });
      const savedVenta = await manager.save(venta);

      for (const d of detallesCalculados) {
        const detalle = manager.create(VentaServicioDetalle, {
          venta_id: savedVenta.id,
          paciente_id: d.paciente_id,
          servicio_id: d.servicio_id,
          tipo_venta_id: d.tipo_venta_id,
          paquete_id: d.paquete_id,
          sesiones_totales: d.sesiones_totales,
          sesiones_usadas: 0,
          precio_unitario: d.precio_unitario,
          descuento_tipo_id: d.descuento_tipo_id,
          descuento_valor: d.descuento_valor ?? 0,
          descuento_monto: d.descuento_monto,
          subtotal: d.subtotal,
        });
        await manager.save(detalle);
      }

      const ventaCompleta = await manager.findOne(VentaServicio, {
        where: { id: savedVenta.id },
        relations: [
          'tipo_pagador', 'paciente', 'responsable', 'comprador_externo',
          'descuento_tipo', 'detalles', 'detalles.servicio', 'detalles.tipo_venta',
          'detalles.paquete', 'detalles.descuento_tipo', 'detalles.paciente',
          'tipo_comprobante',
        ],
      });

      // ✅ La venta recién creada aún no tiene promociones en BD (se registran después).
      ventaCompleta.promociones_aplicadas = [];

      return ventaCompleta;
    });
  }

  /** Incrementa sesiones_usadas en 1 para un detalle (al marcar una cita asistida) */
  async registrarSesionUsada(detalleId: number) {
    const detalle = await this.detalleRepo.findOne({ where: { id: detalleId } });
    if (!detalle) throw new NotFoundException(`Detalle de venta ${detalleId} no encontrado`);
    if (detalle.sesiones_usadas >= detalle.sesiones_totales) {
      throw new BadRequestException('Ya se usaron todas las sesiones disponibles');
    }
    await this.detalleRepo.update(detalleId, {
      sesiones_usadas: detalle.sesiones_usadas + 1,
    });
    return { sesiones_usadas: detalle.sesiones_usadas + 1, sesiones_totales: detalle.sesiones_totales };
  }

  // ── Helpers privados ─────────────────────────────────────────────────────────

  private calcularDetalle(d: DetalleVentaServicioDto) {
    const subtotalSinDescuento = d.precio_unitario * d.sesiones_totales;
    const descuentoMonto = this.calcularDescuentoMonto(
      subtotalSinDescuento,
      d.descuento_tipo_id,
      d.descuento_valor,
    );
    return {
      ...d,
      descuento_monto: descuentoMonto,
      subtotal: subtotalSinDescuento - descuentoMonto,
    };
  }

  private calcularDescuentoMonto(base: number, tipoId?: number, valor?: number): number {
    if (!tipoId || !valor || valor <= 0) return 0;
    if (tipoId === 1) return parseFloat(((base * valor) / 100).toFixed(2));
    if (tipoId === 2) return Math.min(valor, base);
    return 0;
  }

  private async generarCodigoComprobante(manager: any, tipoComprobanteId: number): Promise<string> {
    let prefijo: string;
    let padding: number;

    switch (tipoComprobanteId) {
      case 1:
        prefijo = 'NV-';
        padding = 4;
        break;
      case 2:
        prefijo = 'B001-';
        padding = 5;
        break;
      case 3:
        prefijo = 'F001-';
        padding = 5;
        break;
      default:
        throw new BadRequestException(`Tipo de comprobante ${tipoComprobanteId} no válido`);
    }

    const ultimaVenta = await manager
      .createQueryBuilder(VentaServicio, 'v')
      .where('v.codigo_comprobante LIKE :prefijo', { prefijo: `${prefijo}%` })
      .orderBy('v.id', 'DESC')
      .getOne();

    let siguienteNumero = 1;
    if (ultimaVenta?.codigo_comprobante) {
      const partes = ultimaVenta.codigo_comprobante.split('-');
      const numeroActual = parseInt(partes[partes.length - 1], 10);
      if (!isNaN(numeroActual)) {
        siguienteNumero = numeroActual + 1;
      }
    }

    const numeroFormateado = siguienteNumero.toString().padStart(padding, '0');
    return `${prefijo}${numeroFormateado}`;
  }
}