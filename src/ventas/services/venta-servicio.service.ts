import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VentaServicio } from '../entities/venta-servicio.entity';
import { VentaServicioDetalle } from '../entities/venta-servicio-detalle.entity';
import { CreateVentaServicioDto, DetalleVentaServicioDto } from '../dto/create-venta-servicio.dto';
import { VentaPromocionAplicada } from '../../promociones/entities/venta-promocion-aplicada.entity';
import { ServicioTarifa } from '../../inventario/entities/servicio-tarifa.entity';
import { ServicioPaquetePrecio } from '../../inventario/entities/servicio-paquete-precio.entity';

const TIPO_VENTA_SERVICIO = 2;

@Injectable()
export class VentaServicioService {
  constructor(
    @InjectRepository(VentaServicio)
    private readonly ventaRepo: Repository<VentaServicio>,
    @InjectRepository(VentaServicioDetalle)
    private readonly detalleRepo: Repository<VentaServicioDetalle>,
    @InjectRepository(VentaPromocionAplicada)
    private readonly ventaPromoRepo: Repository<VentaPromocionAplicada>,
    @InjectRepository(ServicioPaquetePrecio)
    private readonly paquetePrecioRepo: Repository<ServicioPaquetePrecio>,
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
      .leftJoinAndSelect('detalles.servicio_tarifa', 'servicio_tarifa')
      .leftJoinAndSelect('servicio_tarifa.servicio', 'servicio')         // nombre del servicio
      .leftJoinAndSelect('servicio_tarifa.motivo_cita', 'motivo_cita')   // motivo de cita
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

    if (ventas.length > 0) {
      const ventaIds = ventas.map((v) => v.id);
      const promociones = await this.ventaPromoRepo.find({
        where: ventaIds.map((id) => ({ tipo_venta_id: TIPO_VENTA_SERVICIO, venta_id: id })),
        relations: ['promocion', 'promocion.reglas', 'promocion.reglas.beneficio_producto'],
      });

      const promosPorVenta = new Map<number, VentaPromocionAplicada[]>();
      for (const p of promociones) {
        if (!promosPorVenta.has(p.venta_id)) promosPorVenta.set(p.venta_id, []);
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
        'descuento_tipo', 'detalles',
        'detalles.servicio_tarifa',
        'detalles.servicio_tarifa.servicio',       // nombre del servicio
        'detalles.servicio_tarifa.motivo_cita',    // motivo de cita
        'detalles.tipo_venta', 'detalles.paquete',
        'detalles.descuento_tipo', 'detalles.paciente',
        'tipo_comprobante',
      ],
    });
    if (!v) throw new NotFoundException(`Venta de servicio ${id} no encontrada`);

    v.promociones_aplicadas = await this.ventaPromoRepo.find({
      where: { tipo_venta_id: TIPO_VENTA_SERVICIO, venta_id: id },
      relations: ['promocion', 'promocion.reglas', 'promocion.reglas.beneficio_producto'],
    });

    return v;
  }

  /** Sesiones con saldo pendiente para un paciente */
  async findPendientesPorPaciente(pacienteId: number) {
    return this.detalleRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.venta', 'venta')
      .leftJoinAndSelect('d.servicio_tarifa', 'servicio_tarifa')
      .leftJoinAndSelect('servicio_tarifa.servicio', 'servicio')        // nombre
      .leftJoinAndSelect('servicio_tarifa.motivo_cita', 'motivo_cita') // motivo
      .leftJoinAndSelect('d.tipo_venta', 'tipo_venta')
      .where('d.paciente_id = :pacienteId', { pacienteId })
      .andWhere('d.sesiones_usadas < d.sesiones_totales')
      .getMany();
  }

  async create(dto: CreateVentaServicioDto) {
    return this.dataSource.transaction(async (manager) => {
      // Enriquecer cada detalle con precio_unitario desde servicio_tarifa
      const detallesEnriquecidos = await Promise.all(
        dto.detalles.map(async (d) => {
          const tarifa = await manager.findOne(ServicioTarifa, {
            where: { id: d.servicio_tarifa_id },
          });
          if (!tarifa) {
            throw new BadRequestException(`ServicioTarifa ${d.servicio_tarifa_id} no encontrada`);
          }

          // Precio: si es paquete, buscar configuración en servicio_paquete_precio
          let precioUnitario = parseFloat(String(tarifa.precio));

          if (d.tipo_venta_id === 2 && d.paquete_id) {
            const config = await manager.findOne(ServicioPaquetePrecio, {
              where: { servicio_tarifa_id: d.servicio_tarifa_id, paquete_id: d.paquete_id, flg_activo: 1 },
            });
            if (config) {
              const sesiones = d.sesiones_totales;
              if (config.tipo_calculo === 'precio_total') {
                precioUnitario = parseFloat(String(config.valor)) / sesiones;
              } else if (config.tipo_calculo === 'descuento_porcentaje') {
                precioUnitario = precioUnitario * (1 - parseFloat(String(config.valor)) / 100);
              }
            }
          }

          return { ...d, precio_unitario: precioUnitario };
        }),
      );

      const detallesCalculados = detallesEnriquecidos.map((d) => this.calcularDetalle(d));

      const subtotal = detallesCalculados.reduce((s, d) => s + d.subtotal, 0);
      const descuentoGlobalMonto = this.calcularDescuentoMonto(subtotal, dto.descuento_tipo_id, dto.descuento_valor);
      const descuentoPromoMonto  = parseFloat((dto.descuento_promocion ?? 0).toFixed(2));
      const descuentoMonto       = parseFloat((descuentoGlobalMonto + descuentoPromoMonto).toFixed(2));
      const total                = Math.max(0, parseFloat((subtotal - descuentoMonto).toFixed(2)));

      const codigoComprobante = await this.generarCodigoComprobante(manager, dto.tipo_comprobante_id);

      const venta = manager.create(VentaServicio, {
        tipo_pagador_id:        dto.tipo_pagador_id,
        paciente_id:            dto.paciente_id,
        responsable_id:         dto.responsable_id,
        comprador_externo_id:   dto.comprador_externo_id,
        fecha_venta:            dto.fecha_venta,
        tipo_comprobante_id:    dto.tipo_comprobante_id,
        codigo_comprobante:     codigoComprobante,
        subtotal,
        descuento_tipo_id:      dto.descuento_tipo_id,
        descuento_valor:        dto.descuento_valor ?? 0,
        descuento_monto:        descuentoMonto,
        descuento_promocion:    descuentoPromoMonto,
        total,
        nota:                   dto.nota,
        user_crea_id:           dto.user_crea_id,
      });
      const savedVenta = await manager.save(venta);

      for (const d of detallesCalculados) {
        const detalle = manager.create(VentaServicioDetalle, {
          venta_id:            savedVenta.id,
          paciente_id:         d.paciente_id,
          servicio_tarifa_id:  d.servicio_tarifa_id,
          tipo_venta_id:       d.tipo_venta_id,
          paquete_id:          d.paquete_id,
          sesiones_totales:    d.sesiones_totales,
          sesiones_usadas:     0,
          precio_unitario:     d.precio_unitario,
          descuento_tipo_id:   d.descuento_tipo_id,
          descuento_valor:     d.descuento_valor ?? 0,
          descuento_monto:     d.descuento_monto,
          subtotal:            d.subtotal,
        });
        await manager.save(detalle);
      }

      const ventaCompleta = await manager.findOne(VentaServicio, {
        where: { id: savedVenta.id },
        relations: [
          'tipo_pagador', 'paciente', 'responsable', 'comprador_externo',
          'descuento_tipo', 'detalles',
          'detalles.servicio_tarifa',
          'detalles.servicio_tarifa.servicio',
          'detalles.servicio_tarifa.motivo_cita',
          'detalles.tipo_venta', 'detalles.paquete',
          'detalles.descuento_tipo', 'detalles.paciente',
          'tipo_comprobante',
        ],
      });

      ventaCompleta.promociones_aplicadas = [];
      return ventaCompleta;
    });
  }

  /** Incrementa sesiones_usadas en 1 (al marcar una cita como asistida) */
  async registrarSesionUsada(detalleId: number) {
    const detalle = await this.detalleRepo.findOne({ where: { id: detalleId } });
    if (!detalle) throw new NotFoundException(`Detalle ${detalleId} no encontrado`);
    if (detalle.sesiones_usadas >= detalle.sesiones_totales) {
      throw new BadRequestException('Ya se usaron todas las sesiones disponibles');
    }
    await this.detalleRepo.update(detalleId, { sesiones_usadas: detalle.sesiones_usadas + 1 });
    return { sesiones_usadas: detalle.sesiones_usadas + 1, sesiones_totales: detalle.sesiones_totales };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────────

  private calcularDetalle(d: DetalleVentaServicioDto & { precio_unitario: number }) {
    const subtotalSinDescuento = d.precio_unitario * d.sesiones_totales;
    const descuentoMonto = this.calcularDescuentoMonto(subtotalSinDescuento, d.descuento_tipo_id, d.descuento_valor);
    return {
      ...d,
      descuento_monto: descuentoMonto,
      subtotal: subtotalSinDescuento - descuentoMonto,
    };
  }

  private calcularDescuentoMonto(base: number, tipoId?: number, valor?: number): number {
    if (!tipoId || !valor || valor <= 0) return 0;
    if (tipoId === 1) return parseFloat(((base * valor) / 100).toFixed(2)); // porcentaje
    if (tipoId === 2) return Math.min(valor, base);                         // monto fijo
    return 0;
  }

  private async generarCodigoComprobante(manager: any, tipoComprobanteId: number): Promise<string> {
    const configs: Record<number, { prefijo: string; padding: number }> = {
      1: { prefijo: 'NV-',    padding: 4 },
      2: { prefijo: 'B001-',  padding: 5 },
      3: { prefijo: 'F001-',  padding: 5 },
    };

    const config = configs[tipoComprobanteId];
    if (!config) throw new BadRequestException(`Tipo de comprobante ${tipoComprobanteId} no válido`);

    const { prefijo, padding } = config;

    const ultima = await manager
      .createQueryBuilder(VentaServicio, 'v')
      .where('v.codigo_comprobante LIKE :prefijo', { prefijo: `${prefijo}%` })
      .orderBy('v.id', 'DESC')
      .getOne();

    let siguiente = 1;
    if (ultima?.codigo_comprobante) {
      const partes = ultima.codigo_comprobante.split('-');
      const num = parseInt(partes[partes.length - 1], 10);
      if (!isNaN(num)) siguiente = num + 1;
    }

    return `${prefijo}${siguiente.toString().padStart(padding, '0')}`;
  }
}