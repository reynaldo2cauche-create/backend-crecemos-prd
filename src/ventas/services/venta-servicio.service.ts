import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VentaServicio } from '../entities/venta-servicio.entity';
import { VentaServicioDetalle } from '../entities/venta-servicio-detalle.entity';
import { VentaServicioPago } from '../entities/venta-servicio-pago.entity';
import { NotaCredito } from '../entities/nota-credito.entity';
import { CreateNotaCreditoDto } from '../dto/create-nota-credito.dto';
import { CreateVentaServicioDto, DetalleVentaServicioDto } from '../dto/create-venta-servicio.dto';
import { UpdateVentaServicioDto } from '../dto/update-venta-servicio.dto';
import { VentaPromocionAplicada } from '../../promociones/entities/venta-promocion-aplicada.entity';
import { ServicioTarifa } from '../../inventario/entities/servicio-tarifa.entity';
import { ServicioPaquetePrecio } from '../../inventario/entities/servicio-paquete-precio.entity';
import { DocumentoTarifa } from '../../inventario/entities/documento-tarifa.entity';
import { Paquete } from 'src/catalogos/paquete.entity';
import { PaqueteCombo } from '../../inventario/entities/paquete-combo.entity';
import { PaqueteComboItem } from '../../inventario/entities/paquete-combo-item.entity';
import { ComprobanteService } from './comprobante.service';
import { MailService } from '../../mail/mail.service';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';

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
    @InjectRepository(VentaServicioPago)
    private readonly ventaPagoRepo: Repository<VentaServicioPago>,
    @InjectRepository(NotaCredito)
    private readonly notaCreditoRepo: Repository<NotaCredito>,
    private readonly dataSource: DataSource,
    private readonly comprobanteService: ComprobanteService,
    private readonly mailService: MailService,
    private readonly notificacionesService: NotificacionesService,
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
      .leftJoinAndSelect('detalles.paqueteCombo', 'paqueteCombo')        // nombre del paquete combo
      .leftJoinAndSelect('detalles.documento_tarifa', 'documento_tarifa')  // nombre del documento
      .leftJoinAndSelect('detalles.descuento_tipo', 'detalle_descuento_tipo')
      .leftJoinAndSelect('detalles.paciente', 'detalle_paciente')
      .leftJoinAndSelect('v.tipo_comprobante', 'tipo_comprobante')
      .leftJoinAndSelect('v.modalidad_pago', 'modalidad_pago')
      .leftJoinAndSelect('v.pagos', 'pagos')
      .leftJoinAndSelect('pagos.modalidad_pago', 'pago_modalidad')
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

  async findHistorial(filtros: {
    page: number;
    limit: number;
    tipo: string;
    desde?: string;
    hasta?: string;
    pacienteId?: number;
    metodoPagoId?: number;
    tipoComprobante?: number;
  }) {
    const { page, limit, tipo, desde, hasta, pacienteId, metodoPagoId } = filtros;
    const offset = page * limit;

    // Filtro por tipo de comprobante: 1=Nota de Venta, 2=Boleta, 3=Factura → ventas con ese
    // comprobante; 4=Nota de Crédito → solo las NC. compVenta filtra ventas; soloNC restringe a NC.
    const compFiltro = filtros.tipoComprobante ? Number(filtros.tipoComprobante) : null;
    const compVenta = compFiltro && compFiltro !== 4 ? compFiltro : null;
    const soloNC = compFiltro === 4;
    const incServ = tipo !== 'productos' && !soloNC;
    const incProd = tipo !== 'servicios' && !soloNC;
    const incNC   = tipo !== 'productos' && (compFiltro === null || compFiltro === 4);

    // Condiciones para venta_servicio
    const condS: string[] = [];
    const paramsS: any[] = [];
    if (desde) { condS.push('vs.fecha_venta >= ?'); paramsS.push(desde); }
    if (hasta) { condS.push('vs.fecha_venta <= ?'); paramsS.push(hasta); }
    if (pacienteId) { condS.push('vs.paciente_id = ?'); paramsS.push(pacienteId); }
    if (compVenta) { condS.push('vs.tipo_comprobante_id = ?'); paramsS.push(compVenta); }
    if (metodoPagoId) { condS.push('(EXISTS (SELECT 1 FROM venta_servicio_pago vsp2 WHERE vsp2.venta_id = vs.id AND vsp2.modalidad_pago_id = ?) OR vs.modalidad_pago_id = ?)'); paramsS.push(metodoPagoId, metodoPagoId); }
    const whereS = condS.length ? 'AND ' + condS.join(' AND ') : '';

    // Condiciones para venta_producto
    const condP: string[] = [];
    const paramsP: any[] = [];
    if (desde) { condP.push('vp.fecha_venta >= ?'); paramsP.push(desde); }
    if (hasta) { condP.push('vp.fecha_venta <= ?'); paramsP.push(hasta); }
    if (pacienteId) { condP.push('vp.paciente_id = ?'); paramsP.push(pacienteId); }
    if (compVenta) { condP.push('vp.tipo_comprobante_id = ?'); paramsP.push(compVenta); }
    if (metodoPagoId) { condP.push('(EXISTS (SELECT 1 FROM venta_producto_pago vpp2 WHERE vpp2.venta_id = vp.id AND vpp2.modalidad_pago_id = ?) OR vp.modalidad_pago_id = ?)'); paramsP.push(metodoPagoId, metodoPagoId); }
    const whereP = condP.length ? 'AND ' + condP.join(' AND ') : '';

    // Condiciones base sin metodoPago — usadas para el monto por método
    const condS_base: string[] = [];
    const paramsS_base: any[] = [];
    if (desde) { condS_base.push('vs.fecha_venta >= ?'); paramsS_base.push(desde); }
    if (hasta) { condS_base.push('vs.fecha_venta <= ?'); paramsS_base.push(hasta); }
    if (pacienteId) { condS_base.push('vs.paciente_id = ?'); paramsS_base.push(pacienteId); }
    if (compVenta) { condS_base.push('vs.tipo_comprobante_id = ?'); paramsS_base.push(compVenta); }
    const whereS_base = condS_base.length ? 'AND ' + condS_base.join(' AND ') : '';

    const condP_base: string[] = [];
    const paramsP_base: any[] = [];
    if (desde) { condP_base.push('vp.fecha_venta >= ?'); paramsP_base.push(desde); }
    if (hasta) { condP_base.push('vp.fecha_venta <= ?'); paramsP_base.push(hasta); }
    if (pacienteId) { condP_base.push('vp.paciente_id = ?'); paramsP_base.push(pacienteId); }
    if (compVenta) { condP_base.push('vp.tipo_comprobante_id = ?'); paramsP_base.push(compVenta); }
    const whereP_base = condP_base.length ? 'AND ' + condP_base.join(' AND ') : '';

    // Condiciones nota_credito (JOIN a venta_servicio para paciente)
    const condN: string[] = [];
    const paramsN: any[] = [];
    if (desde) { condN.push('nc.fecha >= ?'); paramsN.push(desde); }
    if (hasta) { condN.push('nc.fecha <= ?'); paramsN.push(hasta); }
    if (pacienteId) { condN.push('vs.paciente_id = ?'); paramsN.push(pacienteId); }
    if (metodoPagoId) { condN.push('nc.modalidad_pago_id = ?'); paramsN.push(metodoPagoId); }
    const whereN = condN.length ? 'AND ' + condN.join(' AND ') : '';

    // ── Fuentes activas (venta_servicio / venta_producto / nota_credito) ──
    const pageSelects: string[] = [];
    const pageSelParams: any[] = [];
    const countSelects: string[] = [];
    const countParams: any[] = [];

    if (incServ) {
      pageSelects.push(`SELECT id, created_at, 'servicio' as tipo FROM venta_servicio vs WHERE 1=1 ${whereS}`);
      pageSelParams.push(...paramsS);
      countSelects.push(`SELECT id FROM venta_servicio vs WHERE 1=1 ${whereS}`);
      countParams.push(...paramsS);
    }
    if (incProd) {
      pageSelects.push(`SELECT id, created_at, 'producto' as tipo FROM venta_producto vp WHERE 1=1 ${whereP}`);
      pageSelParams.push(...paramsP);
      countSelects.push(`SELECT id FROM venta_producto vp WHERE 1=1 ${whereP}`);
      countParams.push(...paramsP);
    }
    if (incNC) {
      pageSelects.push(`SELECT nc.id, nc.created_at, 'nota_credito' as tipo FROM nota_credito nc JOIN venta_servicio vs ON vs.id = nc.venta_servicio_id WHERE 1=1 ${whereN}`);
      pageSelParams.push(...paramsN);
      countSelects.push(`SELECT nc.id FROM nota_credito nc JOIN venta_servicio vs ON vs.id = nc.venta_servicio_id WHERE 1=1 ${whereN}`);
      countParams.push(...paramsN);
    }

    // Sin fuentes activas (p.ej. pestaña productos + comprobante Nota de Crédito) → vacío.
    if (pageSelects.length === 0) {
      return {
        data: [], total: 0, totalMonto: 0, totalMontoBruto: 0, totalDevoluciones: 0,
        totalMontoGlobal: 0, totalMontoGlobalBruto: 0, totalDevolucionesGlobal: 0, page, limit,
      };
    }

    const countSql = `SELECT COUNT(*) as total FROM ( ${countSelects.join(' UNION ALL ')} ) combined`;
    const pageSql = `${pageSelects.join(' UNION ALL ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    // Monto de ventas (ingresos) de las fuentes venta incluidas — respeta el filtro por método de pago.
    const montoQueries: Promise<any>[] = [];
    if (incServ) {
      montoQueries.push(metodoPagoId
        ? this.dataSource.query(
            `SELECT COALESCE(SUM(COALESCE(ps.sum_monto, vs.total)),0) AS t
               FROM venta_servicio vs
               LEFT JOIN (SELECT venta_id, SUM(monto) sum_monto FROM venta_servicio_pago WHERE modalidad_pago_id=? GROUP BY venta_id) ps ON ps.venta_id=vs.id
              WHERE (ps.venta_id IS NOT NULL OR vs.modalidad_pago_id=?) ${whereS_base}`,
            [metodoPagoId, metodoPagoId, ...paramsS_base])
        : this.dataSource.query(`SELECT COALESCE(SUM(total),0) AS t FROM venta_servicio vs WHERE 1=1 ${whereS}`, [...paramsS]));
    }
    if (incProd) {
      montoQueries.push(metodoPagoId
        ? this.dataSource.query(
            `SELECT COALESCE(SUM(COALESCE(pp.sum_monto, vp.total)),0) AS t
               FROM venta_producto vp
               LEFT JOIN (SELECT venta_id, SUM(monto) sum_monto FROM venta_producto_pago WHERE modalidad_pago_id=? GROUP BY venta_id) pp ON pp.venta_id=vp.id
              WHERE (pp.venta_id IS NOT NULL OR vp.modalidad_pago_id=?) ${whereP_base}`,
            [metodoPagoId, metodoPagoId, ...paramsP_base])
        : this.dataSource.query(`SELECT COALESCE(SUM(total),0) AS t FROM venta_producto vp WHERE 1=1 ${whereP}`, [...paramsP]));
    }

    const ncMontoQuery = incNC
      ? this.dataSource.query(`SELECT COALESCE(SUM(nc.monto_devuelto),0) AS t FROM nota_credito nc JOIN venta_servicio vs ON vs.id=nc.venta_servicio_id WHERE 1=1 ${whereN}`, [...paramsN])
      : Promise.resolve([{ t: 0 }]);

    const globalMontoSql = `
      SELECT
        ((SELECT COALESCE(SUM(total),0) FROM venta_servicio) + (SELECT COALESCE(SUM(total),0) FROM venta_producto)) as bruto,
        (SELECT COALESCE(SUM(monto_devuelto),0) FROM nota_credito) as dev`;

    const [[{ total }], montoRows, [{ t: ncMonto }], pageRows, [{ bruto, dev }]] = await Promise.all([
      this.dataSource.query(countSql, countParams),
      Promise.all(montoQueries),
      ncMontoQuery,
      this.dataSource.query(pageSql, [...pageSelParams, limit, offset]),
      this.dataSource.query(globalMontoSql),
    ]);

    const ventaMontoBruto = (montoRows as any[]).reduce((s, r) => s + Number(r?.[0]?.t || 0), 0);
    const totalDevoluciones = Number(ncMonto || 0);
    const totalDevolucionesGlobal = Number(dev || 0);
    const totalMontoGlobalBruto = Number(bruto || 0);

    const servicioIds: number[] = pageRows.filter(r => r.tipo === 'servicio').map(r => +r.id);
    const productoIds: number[] = pageRows.filter(r => r.tipo === 'producto').map(r => +r.id);
    const ncIds: number[] = pageRows.filter(r => r.tipo === 'nota_credito').map(r => +r.id);

    const [servicios, productos, notas] = await Promise.all([
      servicioIds.length ? this.ventaRepo
        .createQueryBuilder('v')
        .leftJoinAndSelect('v.tipo_pagador', 'tipo_pagador')
        .leftJoinAndSelect('v.paciente', 'paciente')
        .leftJoinAndSelect('v.responsable', 'responsable')
        .leftJoinAndSelect('v.comprador_externo', 'comprador_externo')
        .leftJoinAndSelect('v.descuento_tipo', 'descuento_tipo')
        .leftJoinAndSelect('v.detalles', 'detalles')
        .leftJoinAndSelect('detalles.servicio_tarifa', 'servicio_tarifa')
        .leftJoinAndSelect('servicio_tarifa.servicio', 'servicio')
        .leftJoinAndSelect('servicio_tarifa.motivo_cita', 'motivo_cita')
        .leftJoinAndSelect('detalles.tipo_venta', 'tipo_venta')
        .leftJoinAndSelect('detalles.paquete', 'paquete')
        .leftJoinAndSelect('detalles.paqueteCombo', 'paqueteCombo')
        .leftJoinAndSelect('detalles.documento_tarifa', 'documento_tarifa')
        .leftJoinAndSelect('detalles.descuento_tipo', 'detalle_descuento_tipo')
        .leftJoinAndSelect('detalles.paciente', 'detalle_paciente')
        .leftJoinAndSelect('v.tipo_comprobante', 'tipo_comprobante')
        .leftJoinAndSelect('v.modalidad_pago', 'modalidad_pago')
        .leftJoinAndSelect('v.pagos', 'pagos')
        .leftJoinAndSelect('pagos.modalidad_pago', 'pago_modalidad')
        .leftJoinAndSelect('pagos.validado_por', 'pagos_validador')
        .leftJoinAndSelect('v.user_crea', 'user_crea')
        .whereInIds(servicioIds)
        .getMany() : Promise.resolve([]),

      productoIds.length ? this.dataSource
        .createQueryBuilder()
        .select('v')
        .from('VentaProducto', 'v')
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
        .leftJoinAndSelect('pagos.validado_por', 'pagos_validador')
        .leftJoinAndSelect('v.user_crea', 'user_crea')
        .whereInIds(productoIds)
        .getMany() : Promise.resolve([]),

      ncIds.length ? this.notaCreditoRepo.find({
        where: ncIds.map(id => ({ id })),
        relations: ['venta', 'venta.paciente', 'venta.responsable', 'venta.comprador_externo', 'venta.tipo_pagador', 'modalidad_pago', 'user_crea', 'validado_por_trabajador'],
      }) : Promise.resolve([]),
    ]);

    // Cargar promociones solo para los items de esta página
    const [promosS, promosP] = await Promise.all([
      servicioIds.length ? this.ventaPromoRepo.find({
        where: servicioIds.map(id => ({ tipo_venta_id: TIPO_VENTA_SERVICIO, venta_id: id })),
        relations: ['promocion', 'promocion.reglas', 'promocion.reglas.beneficio_producto'],
      }) : Promise.resolve([]),
      productoIds.length ? this.ventaPromoRepo.find({
        where: productoIds.map(id => ({ tipo_venta_id: 1, venta_id: id })),
        relations: ['promocion', 'promocion.reglas', 'promocion.reglas.beneficio_producto'],
      }) : Promise.resolve([]),
    ]);

    const buildPromoMap = (promos: VentaPromocionAplicada[]) => {
      const map = new Map<number, VentaPromocionAplicada[]>();
      for (const p of promos) {
        if (!map.has(p.venta_id)) map.set(p.venta_id, []);
        map.get(p.venta_id).push(p);
      }
      return map;
    };

    const promoMapS = buildPromoMap(promosS);
    const promoMapP = buildPromoMap(promosP);
    for (const v of servicios) v.promociones_aplicadas = promoMapS.get(v.id) ?? [];
    for (const v of productos as any[]) v.promociones_aplicadas = promoMapP.get(v.id) ?? [];

    // Reordenar según el orden original de pageRows (servicio / producto / nota_credito)
    const sMap = new Map(servicios.map(v => [v.id, { ...v, tipo: 'servicio' }]));
    const pMap = new Map((productos as any[]).map(v => [v.id, { ...v, tipo: 'producto' }]));
    const ncMap = new Map((notas as any[]).map(n => [n.id, this.mapNotaCreditoRow(n)]));
    const data = pageRows
      .map(r =>
        r.tipo === 'servicio' ? sMap.get(+r.id)
        : r.tipo === 'producto' ? pMap.get(+r.id)
        : ncMap.get(+r.id),
      )
      .filter(Boolean);

    return {
      data,
      total: +total,
      totalMonto: ventaMontoBruto - totalDevoluciones,   // neto (ventas − devoluciones)
      totalMontoBruto: ventaMontoBruto,
      totalDevoluciones,
      totalMontoGlobal: totalMontoGlobalBruto - totalDevolucionesGlobal,
      totalMontoGlobalBruto,
      totalDevolucionesGlobal,
      page,
      limit,
    };
  }

  /** Convierte una nota de crédito en una fila compatible con el historial de ventas. */
  private mapNotaCreditoRow(nc: any): any {
    const v = nc.venta;
    const monto = Number(nc.monto_devuelto);
    return {
      id: nc.id,
      tipo: 'nota_credito',
      es_nota_credito: true,
      codigo_comprobante: nc.codigo,
      fecha_venta: nc.fecha,
      created_at: nc.created_at,
      tipo_comprobante: { id: 4, nombre: 'Nota de Crédito' },
      tipo_pagador_id: v?.tipo_pagador_id ?? null,
      paciente: v?.paciente ?? null,
      responsable: v?.responsable ?? null,
      comprador_externo: v?.comprador_externo ?? null,
      subtotal: -monto,
      descuento_monto: 0,
      total: -monto,
      detalles: [],
      pagos: nc.modalidad_pago
        ? [{ id: `nc-${nc.id}`, modalidad_pago: nc.modalidad_pago, monto: -monto, referencia: null }]
        : [],
      promociones_aplicadas: [],
      nota_credito: nc,
      venta_servicio_id: nc.venta_servicio_id,
    };
  }

  async validarPago(pagoId: number, userId: number) {
    const pago = await this.ventaPagoRepo.findOne({ where: { id: pagoId } });
    if (!pago) throw new NotFoundException(`Pago de servicio #${pagoId} no encontrado`);
    if (pago.pago_validado) return this.ventaPagoRepo.findOne({ where: { id: pagoId }, relations: ['modalidad_pago', 'validado_por'] });
    await this.ventaPagoRepo.update(pagoId, {
      pago_validado:     true,
      pago_validado_por: userId,
      pago_validado_at:  new Date(),
    });
    return this.ventaPagoRepo.findOne({
      where: { id: pagoId },
      relations: ['modalidad_pago', 'validado_por'],
    });
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
        'detalles.paqueteCombo',                   // nombre del paquete combo
        'detalles.documento_tarifa',               // nombre del documento
        'detalles.descuento_tipo', 'detalles.paciente',
        'tipo_comprobante',
        'modalidad_pago',
        'pagos',
        'pagos.modalidad_pago',
      ],
    });
    if (!v) throw new NotFoundException(`Venta de servicio ${id} no encontrada`);

    v.promociones_aplicadas = await this.ventaPromoRepo.find({
      where: { tipo_venta_id: TIPO_VENTA_SERVICIO, venta_id: id },
      relations: ['promocion', 'promocion.reglas', 'promocion.reglas.beneficio_producto'],
    });

    (v as any).nota_credito = await this.notaCreditoRepo.findOne({
      where: { venta_servicio_id: id },
      relations: ['modalidad_pago', 'user_crea', 'validado_por_trabajador'],
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
      // ✨ EXPANDIR PAQUETES COMBO: Si un detalle tiene tipo_venta_id=3 y paquete_combo_id,
      // lo expandimos en múltiples líneas (una por cada ítem del combo)
      let detallesExpandidos: DetalleVentaServicioDto[] = [];

      for (const d of dto.detalles) {
        if (d.tipo_venta_id === 3 && d.paquete_combo_id) {
          // Buscar el combo y sus ítems
          const combo = await manager.findOne(PaqueteCombo, {
            where: { id: d.paquete_combo_id, flgActivo: 1 },
            relations: ['items', 'items.servicioTarifa', 'items.documentoTarifa'],
          });

          if (!combo) {
            throw new BadRequestException(`Paquete combo ${d.paquete_combo_id} no encontrado o inactivo`);
          }

          if (!combo.items || combo.items.length === 0) {
            throw new BadRequestException(`Paquete combo ${d.paquete_combo_id} no tiene ítems configurados`);
          }

          // Por cada ítem del combo, crear un detalle
          for (const item of combo.items) {
            const tipoItem = item.servicioTarifaId ? 1 : 2; // 1=Servicio, 2=Documento

            detallesExpandidos.push({
              paciente_id: d.paciente_id,
              tipo_item_venta: tipoItem,
              servicio_tarifa_id: item.servicioTarifaId,
              documento_tarifa_id: item.documentoTarifaId,
              descripcion_linea: item.descripcionLinea || `${combo.nombre} - ${tipoItem === 1 ? 'Servicio' : 'Documento'}`,
              tipo_venta_id: 3, // Paquete combo
              paquete_combo_id: combo.id,
              sesiones_totales: item.cantidad,
              descuento_tipo_id: null,
              descuento_valor: 0,
              precio_unitario: 0, // El precio del combo se asigna al detalle principal, los ítems expandidos tienen precio_unitario=0
            });
          }
        } else {
          // Detalle normal (tipo_venta_id=1 o 2)
          detallesExpandidos.push(d);
        }
      }

      // Enriquecer cada detalle con precio_unitario desde servicio_tarifa
      const detallesEnriquecidos = await Promise.all(
        detallesExpandidos.map(async (d) => {
          const tipoItem = d.tipo_item_venta ?? 1; // Default: Servicio con cita
          let precioUnitario = 0;
          let motivoCitaId = null;
          let descripcionLinea = d.descripcion_linea;
          let _servicio_id: number | null = null;
          let _motivo_nombre: string | null = null;
          let _servicio_nombre: string | null = null;

          // Si es paquete combo (tipo_venta_id=3), precio_unitario = 0
          // El precio total está en paquete_combo.precioTotal
          const esPaqueteCombo = d.tipo_venta_id === 3;

          // Si viene paquete_combo_id Y precio_unitario del frontend, respetar ese precio
          const tieneComboConPrecio = d.paquete_combo_id && d.precio_unitario !== undefined && d.precio_unitario !== null;

          if (tipoItem === 1) {
            // TIPO 1: Servicio con cita
            if (!d.servicio_tarifa_id) {
              throw new BadRequestException('servicio_tarifa_id es obligatorio para tipo_item_venta=1');
            }

            const tarifa = await manager.findOne(ServicioTarifa, {
              where: { id: d.servicio_tarifa_id },
              relations: ['motivo_cita', 'servicio'],
            });
            if (!tarifa) {
              throw new BadRequestException(`ServicioTarifa ${d.servicio_tarifa_id} no encontrada`);
            }

            // Copiar motivo_cita_id desde servicio_tarifa (DESNORMALIZACIÓN)
            motivoCitaId = tarifa.motivo_cita_id;
            _servicio_id = tarifa.servicio_id;
            _motivo_nombre = tarifa.motivo_cita?.nombre ?? null;
            _servicio_nombre = tarifa.servicio?.nombre ?? null;

            // Precio: Si tiene paquete_combo_id con precio del frontend, usar ese precio
            if (tieneComboConPrecio) {
              precioUnitario = parseFloat(String(d.precio_unitario));
            } else if (esPaqueteCombo) {
              precioUnitario = 0;
            } else {
              // Precio: si es paquete, buscar configuración en servicio_paquete_precio
              precioUnitario = parseFloat(String(tarifa.precio));
            }

            if (d.tipo_venta_id === 2 && d.paquete_id) {
              const config = await manager.findOne(ServicioPaquetePrecio, {
                where: { servicio_tarifa_id: d.servicio_tarifa_id, paquete_id: d.paquete_id, flg_activo: 1 },
              });
              if (config) {
                // Buscar el paquete para obtener sus sesiones base
                const paquete = await manager.findOne(Paquete, {  // ← ajusta el nombre de tu entidad
                  where: { id: d.paquete_id },
                });
                const sesionesPaquete = paquete?.cantidadSesiones;
                
                if (config.tipo_calculo === 'precio_total') {
                  precioUnitario = parseFloat(String(config.valor)) / sesionesPaquete;  // ← divide por sesiones del paquete
                } else if (config.tipo_calculo === 'descuento_porcentaje') {
                  precioUnitario = precioUnitario * (1 - parseFloat(String(config.valor)) / 100);
                }
              }
            }

            // Generar descripción automática si no viene del frontend
            if (!descripcionLinea && tarifa.motivo_cita && tarifa.servicio) {
              const sesionLabel = d.sesiones_totales === 1 ? 'Sesión' : 'Sesiones';
              descripcionLinea = `${d.sesiones_totales} ${sesionLabel} de ${tarifa.motivo_cita.nombre} - ${tarifa.servicio.nombre}`;
            }

          } else if (tipoItem === 2) {
            // TIPO 2: Documento sin cita
            if (!d.documento_tarifa_id) {
              throw new BadRequestException('documento_tarifa_id es obligatorio para tipo_item_venta=2');
            }

            const documento = await manager.findOne(DocumentoTarifa, {
              where: { id: d.documento_tarifa_id, flgActivo: 1 },
            });
            if (!documento) {
              throw new BadRequestException(`DocumentoTarifa ${d.documento_tarifa_id} no encontrado o inactivo`);
            }

            // Precio: Si tiene paquete_combo_id con precio del frontend, usar ese precio
            if (tieneComboConPrecio) {
              precioUnitario = parseFloat(String(d.precio_unitario));
            } else if (esPaqueteCombo) {
              precioUnitario = 0;
            } else {
              precioUnitario = parseFloat(String(documento.precio));
            }

            // Para documentos, descripcion_linea es el nombre del documento
            if (!descripcionLinea) {
              descripcionLinea = documento.nombre;
            }
          }

          return {
            ...d,
            tipo_item_venta: tipoItem,
            motivo_cita_id: motivoCitaId,
            precio_unitario: precioUnitario,
            descripcion_linea: descripcionLinea,
            _servicio_id,
            _motivo_nombre,
            _servicio_nombre,
          };
        }),
      );

      // Regla clínica: Psicología Infantil (4), Psicología Adolescentes (12),
      // Psicoterapia Individual (7) — si el motivo es Evaluación y sesiones >= 2,
      // la última sesión se convierte en Informe Verbal.
      const SERVICIOS_REGLA_EVALUACION = [4, 7, 12];
      const detallesConRegla: typeof detallesEnriquecidos = [];

      for (const d of detallesEnriquecidos) {
        const aplicaRegla =
          d.tipo_item_venta === 1 &&
          !d.paquete_combo_id &&   // los combos ya incluyen su propio informe
          d.sesiones_totales >= 2 &&
          SERVICIOS_REGLA_EVALUACION.includes(d._servicio_id) &&
          d._motivo_nombre?.toLowerCase().includes('evaluaci');

        if (aplicaRegla) {
          const tarifaInformeVerbal = await manager
            .createQueryBuilder(ServicioTarifa, 'st')
            .innerJoinAndSelect('st.motivo_cita', 'mc')
            .where('st.servicio_id = :sid', { sid: d._servicio_id })
            .andWhere('LOWER(mc.nombre) LIKE :nombre', { nombre: '%informe verbal%' })
            .andWhere('st.flg_activo = 1')
            .getOne();

          if (!tarifaInformeVerbal) {
            throw new BadRequestException(
              `No existe tarifa de "Informe Verbal" configurada para el servicio "${d._servicio_nombre}". Configúrela en tarifas antes de registrar la venta.`,
            );
          }

          const sesionesEval = d.sesiones_totales - 1;
          const labelEval = sesionesEval === 1 ? 'Sesión' : 'Sesiones';

          detallesConRegla.push({
            ...d,
            sesiones_totales: sesionesEval,
            descripcion_linea: `${sesionesEval} ${labelEval} de ${d._motivo_nombre} - ${d._servicio_nombre}`,
          });

          detallesConRegla.push({
            ...d,
            servicio_tarifa_id: tarifaInformeVerbal.id,
            motivo_cita_id: tarifaInformeVerbal.motivo_cita_id,
            precio_unitario: parseFloat(String(tarifaInformeVerbal.precio)),
            sesiones_totales: 1,
            tipo_venta_id: 1,
            paquete_id: null,
            paquete_combo_id: null,
            descripcion_linea: `1 Sesión de ${tarifaInformeVerbal.motivo_cita.nombre} - ${d._servicio_nombre}`,
          });
        } else {
          detallesConRegla.push(d);
        }
      }

      const detallesCalculados = detallesConRegla.map((d) => this.calcularDetalle(d));

      const subtotal = detallesCalculados.reduce((s, d) => s + d.subtotal, 0);
      const descuentoGlobalMonto = this.calcularDescuentoMonto(subtotal, dto.descuento_tipo_id, dto.descuento_valor);
      const descuentoPromoMonto  = parseFloat((Number(dto.descuento_promocion ?? 0)).toFixed(2));
      const descuentoMonto       = parseFloat((descuentoGlobalMonto + descuentoPromoMonto).toFixed(2));
      const total                = Math.max(0, parseFloat((subtotal - descuentoMonto).toFixed(2)));

      const codigoComprobante = await this.comprobanteService.generarCodigo(manager, dto.tipo_comprobante_id);

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
        observaciones:          dto.observaciones,
        modalidad_pago_id:      dto.modalidad_pago_id ?? null,
        user_crea_id:           dto.user_crea_id,
      });
      const savedVenta = await manager.save(venta);

      for (const d of detallesCalculados) {
        const detalle = manager.create(VentaServicioDetalle, {
          venta_id:            savedVenta.id,
          tipoItemVenta:       d.tipo_item_venta ?? 1,
          paciente_id:         d.paciente_id,
          servicio_tarifa_id:  d.servicio_tarifa_id ?? null,
          motivoCitaId:        d.motivo_cita_id ?? null,
          documentoTarifaId:   d.documento_tarifa_id ?? null,
          descripcionLinea:    d.descripcion_linea ?? null,
          tipo_venta_id:       d.tipo_venta_id,
          paquete_id:          d.paquete_id,
          paquete_combo_id:    d.paquete_combo_id,
          sesiones_totales:    d.sesiones_totales,
          sesiones_usadas:     d.tipo_item_venta === 2 ? 1 : 0, // Documentos se entregan inmediatamente
          precio_unitario:     d.precio_unitario,
          descuento_tipo_id:   d.descuento_tipo_id,
          descuento_valor:     d.descuento_valor ?? 0,
          descuento_monto:     d.descuento_monto,
          subtotal:            d.subtotal,
        });
        await manager.save(detalle);
      }

      // Guardar pagos múltiples
      if (dto.pagos && dto.pagos.length > 0) {
        for (const p of dto.pagos) {
          const pago = manager.create(VentaServicioPago, {
            venta_id: savedVenta.id,
            modalidad_pago_id: p.modalidad_pago_id,
            monto: p.monto,
            referencia: p.referencia ?? null,
            fecha_pago: p.fecha_pago ?? null,
          });
          await manager.save(pago);
        }
      }

      const ventaCompleta = await manager.findOne(VentaServicio, {
        where: { id: savedVenta.id },
        relations: [
          'tipo_pagador', 'paciente', 'responsable', 'comprador_externo',
          'descuento_tipo', 'detalles',
          'detalles.servicio_tarifa',
          'detalles.servicio_tarifa.servicio',
          'detalles.servicio_tarifa.motivo_cita',
          'detalles.documento_tarifa',
          'detalles.tipo_venta', 'detalles.paquete',
          'detalles.descuento_tipo', 'detalles.paciente',
          'tipo_comprobante', 'modalidad_pago', 'pagos', 'pagos.modalidad_pago',
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

  /** Actualiza campos editables de una venta de servicio */
  async update(id: number, dto: UpdateVentaServicioDto) {
    console.log(`🔥🔥🔥 INICIO: Intentando actualizar venta de servicio ID ${id}`);

    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['detalles', 'detalles.servicio_tarifa', 'detalles.servicio_tarifa.servicio',
        'tipo_comprobante', 'modalidad_pago'],
    });
    if (!venta) {
      console.log(`❌ Venta ${id} no encontrada`);
      throw new NotFoundException(`Venta de servicio ${id} no encontrada`);
    }

    console.log(`✅ Venta ${id} encontrada, tiene ${venta.detalles.length} detalles`);

    // 📋 Snapshot del estado ANTES de editar (para auditoría descriptiva con antes → después)
    const _auditoriaAntes = {
      total: Number(venta.total),
      subtotal: Number(venta.subtotal),
      descuento_monto: Number(venta.descuento_monto),
      nota: venta.nota,
      observaciones: venta.observaciones,
      tipo_comprobante_id: venta.tipo_comprobante_id,
      tipo_comprobante_nombre: venta.tipo_comprobante?.nombre ?? null,
      modalidad_pago_id: venta.modalidad_pago_id,
      modalidad_pago_nombre: venta.modalidad_pago?.nombre ?? null,
      numDetalles: venta.detalles.length,
      // Cada línea con sus valores, para detectar cambios a nivel de ítem
      itemsDetalle: venta.detalles.map((d: any) => ({
        clave: d.descripcionLinea || d.servicio_tarifa?.servicio?.nombre || `st${d.servicio_tarifa_id}` || 'item',
        nombre: d.descripcionLinea || d.servicio_tarifa?.servicio?.nombre || 'ítem',
        cantidad: Number(d.sesiones_totales ?? 1),
        precio: Number(d.precio_unitario ?? 0),
        subtotal: Number(d.subtotal ?? 0),
      })),
    };

    // 🔥 VERIFICAR SI REALMENTE HAY CITAS ASOCIADAS (no confiar solo en sesiones_usadas)
    if (dto.detalles && dto.detalles.length > 0) {
      const detalleIds = venta.detalles.map(d => d.id);

      if (detalleIds.length > 0) {
        const citasInfo = await this.dataSource.query(`
          SELECT
            c.id,
            c.venta_servicio_detalle_id,
            c.fecha,
            c.flg_activo
          FROM citas c
          WHERE c.venta_servicio_detalle_id IN (?)
        `, [detalleIds]);

        console.log(`🔍 Citas encontradas (total ${citasInfo.length}):`, citasInfo);

        const citasActivas = citasInfo.filter(c => c.flg_activo === 1);

        if (citasActivas.length > 0) {
          throw new BadRequestException(
            `No se pueden modificar los detalles porque esta venta tiene ${citasActivas.length} cita(s) activa(s) asociada(s)`
          );
        }
      }
    }

    await this.dataSource.transaction(async (manager) => {
      let subtotalFinal = venta.subtotal;

      // Si se envían detalles, reemplazar completamente
      if (dto.detalles && dto.detalles.length > 0) {
        // Eliminar detalles antiguos
        await manager.delete(VentaServicioDetalle, { venta_id: id });

        // Enriquecer y crear nuevos detalles
        const detallesEnriquecidos = await Promise.all(
          dto.detalles.map(async (d) => {
            const tipoItem = d.tipo_item_venta ?? 1;
            let precioUnitario = 0;
            let motivoCitaId = null;
            let descripcionLinea = d.descripcion_linea;

            // Si el ítem pertenece a un combo, el frontend ya envía el precio correcto
            const tieneComboConPrecio = d.paquete_combo_id && d.precio_unitario !== undefined && d.precio_unitario !== null;

            if (tipoItem === 1) {
              if (!d.servicio_tarifa_id) {
                throw new BadRequestException('servicio_tarifa_id es obligatorio para tipo_item_venta=1');
              }

              const tarifa = await manager.findOne(ServicioTarifa, {
                where: { id: d.servicio_tarifa_id },
                relations: ['motivo_cita', 'servicio'],
              });
              if (!tarifa) {
                throw new BadRequestException(`ServicioTarifa ${d.servicio_tarifa_id} no encontrada`);
              }

              motivoCitaId = tarifa.motivo_cita_id;

              if (tieneComboConPrecio) {
                // Respetar el precio enviado por el frontend (precio total del combo o 0 para ítems secundarios)
                precioUnitario = parseFloat(String(d.precio_unitario));
              } else {
                precioUnitario = parseFloat(String(tarifa.precio));

                if (d.tipo_venta_id === 2 && d.paquete_id) {
                  const config = await manager.findOne(ServicioPaquetePrecio, {
                    where: { servicio_tarifa_id: d.servicio_tarifa_id, paquete_id: d.paquete_id, flg_activo: 1 },
                  });
                  if (config) {
                    const paquete = await manager.findOne(Paquete, { where: { id: d.paquete_id } });
                    const sesionesPaquete = paquete?.cantidadSesiones;
                    if (config.tipo_calculo === 'precio_total') {
                      precioUnitario = parseFloat(String(config.valor)) / sesionesPaquete;
                    } else if (config.tipo_calculo === 'descuento_porcentaje') {
                      precioUnitario = precioUnitario * (1 - parseFloat(String(config.valor)) / 100);
                    }
                  }
                }
              }

              if (!descripcionLinea && tarifa.motivo_cita && tarifa.servicio) {
                const sesionLabel = d.sesiones_totales === 1 ? 'Sesión' : 'Sesiones';
                descripcionLinea = `${d.sesiones_totales} ${sesionLabel} de ${tarifa.motivo_cita.nombre} - ${tarifa.servicio.nombre}`;
              }

            } else if (tipoItem === 2) {
              if (!d.documento_tarifa_id) {
                throw new BadRequestException('documento_tarifa_id es obligatorio para tipo_item_venta=2');
              }

              const documento = await manager.findOne(DocumentoTarifa, {
                where: { id: d.documento_tarifa_id, flgActivo: 1 },
              });
              if (!documento) {
                throw new BadRequestException(`DocumentoTarifa ${d.documento_tarifa_id} no encontrado o inactivo`);
              }

              if (tieneComboConPrecio) {
                precioUnitario = parseFloat(String(d.precio_unitario));
              } else {
                precioUnitario = parseFloat(String(documento.precio));
              }

              if (!descripcionLinea) {
                descripcionLinea = documento.nombre;
              }
            }

            return {
              ...d,
              tipo_item_venta: tipoItem,
              motivo_cita_id: motivoCitaId,
              precio_unitario: precioUnitario,
              descripcion_linea: descripcionLinea,
            };
          }),
        );

        const detallesCalculados = detallesEnriquecidos.map((d) => this.calcularDetalle(d));
        subtotalFinal = detallesCalculados.reduce((s, d) => s + d.subtotal, 0);

        // Guardar nuevos detalles
        for (const d of detallesCalculados) {
          const detalle = manager.create(VentaServicioDetalle, {
            venta_id: id,
            tipoItemVenta:       d.tipo_item_venta ?? 1,
            paciente_id:         d.paciente_id,
            servicio_tarifa_id:  d.servicio_tarifa_id ?? null,
            motivoCitaId:        d.motivo_cita_id ?? null,
            documentoTarifaId:   d.documento_tarifa_id ?? null,
            descripcionLinea:    d.descripcion_linea ?? null,
            tipo_venta_id:       d.tipo_venta_id,
            paquete_id:          d.paquete_id,
            paquete_combo_id:    d.paquete_combo_id,
            sesiones_totales:    d.sesiones_totales,
            sesiones_usadas:     d.tipo_item_venta === 2 ? 1 : 0,
            precio_unitario:     d.precio_unitario,
            descuento_tipo_id:   d.descuento_tipo_id,
            descuento_valor:     d.descuento_valor ?? 0,
            descuento_monto:     d.descuento_monto,
            subtotal:            d.subtotal,
          });
          await manager.save(detalle);
        }
      }

      // Actualizar campos de la venta
      const camposActualizables: Partial<VentaServicio> = {};

      if (dto.tipo_pagador_id !== undefined)       camposActualizables.tipo_pagador_id       = dto.tipo_pagador_id;
    if (dto.paciente_id !== undefined)           camposActualizables.paciente_id           = dto.paciente_id;
    if (dto.responsable_id !== undefined)        camposActualizables.responsable_id        = dto.responsable_id;
    if (dto.comprador_externo_id !== undefined)  camposActualizables.comprador_externo_id  = dto.comprador_externo_id;
    if (dto.tipo_comprobante_id !== undefined)   camposActualizables.tipo_comprobante_id   = dto.tipo_comprobante_id;

      if (dto.nota !== undefined) camposActualizables.nota = dto.nota;
      if (dto.observaciones !== undefined) camposActualizables.observaciones = dto.observaciones;
      if (dto.modalidad_pago_id !== undefined) camposActualizables.modalidad_pago_id = dto.modalidad_pago_id;

      // Recalcular descuentos y totales
      const descuentoTipoId = dto.descuento_tipo_id ?? venta.descuento_tipo_id;
      const descuentoValor = dto.descuento_valor ?? venta.descuento_valor;
      const descuentoGlobalMonto = this.calcularDescuentoMonto(subtotalFinal, descuentoTipoId, descuentoValor);
      const descuentoPromoMonto = parseFloat(Number(venta.descuento_promocion ?? 0).toFixed(2)); 
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

      await manager.update(VentaServicio, id, camposActualizables);

      // Reemplazar pagos si se envían, preservando el estado de validación
      if (dto.pagos && dto.pagos.length > 0) {
        const pagosExistentes = await manager.find(VentaServicioPago, { where: { venta_id: id } });
        await manager.delete(VentaServicioPago, { venta_id: id });
        for (const p of dto.pagos) {
          const prev = pagosExistentes.find(pe => pe.modalidad_pago_id === p.modalidad_pago_id);
          const pago = manager.create(VentaServicioPago, {
            venta_id: id,
            modalidad_pago_id:  p.modalidad_pago_id,
            monto:              p.monto,
            referencia:         p.referencia ?? null,
            fecha_pago:         p.fecha_pago ?? null,
            pago_validado:      prev?.pago_validado     ?? false,
            pago_validado_por:  prev?.pago_validado_por ?? null,
            pago_validado_at:   prev?.pago_validado_at  ?? null,
          });
          await manager.save(pago);
        }
      }

    });

    // ⚠️ findOne DESPUÉS del commit: dentro de la transacción, this.findOne usa otra
    // conexión y leía los valores VIEJOS, por eso la auditoría decía "sin cambios".
    const actualizada: any = await this.findOne(id);
    actualizada._auditoriaAntes = _auditoriaAntes;
    return actualizada;
  }

  /** Verifica si una venta tiene citas asociadas */
  async verificarTieneCitas(id: number): Promise<{ tieneCitas: boolean; cantidadCitas: number; mensaje?: string }> {
    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['detalles']
    });

    if (!venta) {
      throw new NotFoundException(`Venta de servicio ${id} no encontrada`);
    }

    const detalleIds = venta.detalles.map(d => d.id);

    if (detalleIds.length === 0) {
      return { tieneCitas: false, cantidadCitas: 0 };
    }

    const citasCount = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM citas
      WHERE venta_servicio_detalle_id IN (?)
        AND flg_activo = 1
    `, [detalleIds]);

    const total = citasCount[0]?.total || 0;

    return {
      tieneCitas: total > 0,
      cantidadCitas: total,
      mensaje: total > 0 ? `Esta venta tiene ${total} cita(s) asociada(s)` : undefined
    };
  }

  /** Elimina una venta de servicio (solo si no tiene sesiones usadas) */
  async remove(id: number) {
    console.log(`🔥🔥🔥 INICIO: Intentando eliminar venta de servicio ID ${id}`);

    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['detalles', 'detalles.servicio_tarifa', 'detalles.servicio_tarifa.servicio',
        'paciente', 'responsable', 'comprador_externo', 'tipo_comprobante'],
    });

    if (!venta) {
      console.log(`❌ Venta ${id} no encontrada`);
      throw new NotFoundException(`Venta de servicio ${id} no encontrada`);
    }

    console.log(`✅ Venta ${id} encontrada, tiene ${venta.detalles.length} detalles`);

    // 📋 Resumen de lo que se elimina (para auditoría, antes de borrar los registros)
    const resumen = {
      codigo_comprobante: venta.codigo_comprobante,
      total: Number(venta.total),
      fecha_venta: venta.fecha_venta,
      tipo_comprobante: venta.tipo_comprobante,
      paciente: venta.paciente,
      responsable: venta.responsable,
      comprador_externo: venta.comprador_externo,
      detalles: venta.detalles,
    };

    // 🔥 VERIFICAR SI REALMENTE HAY CITAS ASOCIADAS (no confiar solo en sesiones_usadas)
    const detalleIds = venta.detalles.map(d => d.id);

    console.log(`🔍 Eliminando venta ${id}`);
    console.log(`🔍 Detalles encontrados:`, venta.detalles.map(d => ({
      id: d.id,
      sesiones_totales: d.sesiones_totales,
      sesiones_usadas: d.sesiones_usadas
    })));

    if (detalleIds.length > 0) {
      const citasInfo = await this.dataSource.query(`
        SELECT
          c.id,
          c.venta_servicio_detalle_id,
          c.fecha,
          c.flg_activo
        FROM citas c
        WHERE c.venta_servicio_detalle_id IN (?)
      `, [detalleIds]);

      console.log(`🔍 Citas encontradas (total ${citasInfo.length}):`, citasInfo);

      const citasActivas = citasInfo.filter(c => c.flg_activo === 1);

      if (citasActivas.length > 0) {
        throw new BadRequestException(
          `No se puede eliminar esta venta porque tiene ${citasActivas.length} cita(s) activa(s) asociada(s)`
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // Eliminar promociones aplicadas
      await manager.delete(VentaPromocionAplicada, {
        tipo_venta_id: TIPO_VENTA_SERVICIO,
        venta_id: id
      });

      // Eliminar detalles
      await manager.delete(VentaServicioDetalle, { venta_id: id });

      // Eliminar venta
      await manager.delete(VentaServicio, id);

      return { message: 'Venta de servicio eliminada exitosamente', id, resumen };
    });
  }

  // ── Devoluciones / Notas de crédito ─────────────────────────────────────────────

  /**
   * Estados de cita que YA se realizaron o ya no ocupan agenda (no se anulan):
   * 5=Cancelada, 6=Sesión Dictada, 7=Asistió, 8=No asistió, 9=Anulada.
   * Todo lo demás (típicamente 1=Programada) es una cita pendiente que sí se anula.
   */
  private readonly ESTADOS_CITA_NO_PENDIENTE = [5, 6, 7, 8, 9];

  /**
   * Vista previa de una devolución: cuántas citas futuras pendientes se anularían,
   * cuántas sesiones sin asignar se perderían y un monto sugerido a devolver.
   */
  async previewDevolucion(id: number) {
    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: [
        'detalles', 'detalles.servicio_tarifa', 'detalles.servicio_tarifa.servicio',
        'detalles.servicio_tarifa.motivo_cita', 'detalles.documento_tarifa',
        'paciente', 'tipo_comprobante',
      ],
    });
    if (!venta) throw new NotFoundException(`Venta de servicio ${id} no encontrada`);

    const notaExistente = await this.notaCreditoRepo.findOne({
      where: { venta_servicio_id: id },
      relations: ['modalidad_pago', 'user_crea', 'validado_por_trabajador'],
    });

    const detalleIds = venta.detalles.map(d => d.id);
    let citasPorDetalle = new Map<number, number>();
    if (detalleIds.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT venta_servicio_detalle_id AS did, COUNT(*) AS total
           FROM citas
          WHERE venta_servicio_detalle_id IN (?)
            AND flg_activo = 1
            AND estado_id NOT IN (${this.ESTADOS_CITA_NO_PENDIENTE.join(',')})
          GROUP BY venta_servicio_detalle_id`,
        [detalleIds],
      );
      citasPorDetalle = new Map(rows.map((r: any) => [Number(r.did), Number(r.total)]));
    }

    let totalCitasPendientes = 0;
    let totalSesionesSinAsignar = 0;
    let montoSugerido = 0;

    // Ratio del descuento global: venta.total = venta.subtotal - descuentos globales.
    // Devolvemos proporcional al total realmente pagado, no al precio de lista.
    const subtotalVenta = Number(venta.subtotal) || 0;
    const totalVenta = Number(venta.total) || 0;
    const ratioGlobal = subtotalVenta > 0 ? totalVenta / subtotalVenta : 1;

    const lineas = venta.detalles.map(d => {
      const citasPendientes = citasPorDetalle.get(d.id) ?? 0;
      const sesionesTotales = Number(d.sesiones_totales) || 0;
      const sesionesSinAsignar = Math.max(0, sesionesTotales - Number(d.sesiones_usadas));
      const sesionesAnulables = citasPendientes + sesionesSinAsignar;

      // Valor NETO por sesión = subtotal de la línea (ya con descuento de línea) / sesiones,
      // ajustado por el descuento global. Anular todo ⇒ suma exacta = venta.total.
      const netoPorSesion = sesionesTotales > 0 ? Number(d.subtotal) / sesionesTotales : 0;
      const montoLinea = parseFloat((netoPorSesion * sesionesAnulables * ratioGlobal).toFixed(2));

      totalCitasPendientes += citasPendientes;
      totalSesionesSinAsignar += sesionesSinAsignar;
      montoSugerido += montoLinea;

      return {
        detalle_id: d.id,
        descripcion: d.descripcionLinea
          || d.servicio_tarifa?.servicio?.nombre
          || d.documento_tarifa?.nombre
          || 'Ítem',
        sesiones_totales: Number(d.sesiones_totales),
        sesiones_usadas: Number(d.sesiones_usadas),
        citas_pendientes: citasPendientes,
        sesiones_sin_asignar: sesionesSinAsignar,
        sesiones_anulables: sesionesAnulables,
        monto_linea: montoLinea,
      };
    });

    return {
      venta_id: venta.id,
      codigo_comprobante: venta.codigo_comprobante,
      total_venta: Number(venta.total),
      ya_devuelta: !!notaExistente,
      nota_credito: notaExistente ?? null,
      total_citas_pendientes: totalCitasPendientes,
      total_sesiones_sin_asignar: totalSesionesSinAsignar,
      total_sesiones_anulables: totalCitasPendientes + totalSesionesSinAsignar,
      monto_sugerido: parseFloat(montoSugerido.toFixed(2)),
      lineas,
    };
  }

  /**
   * Registra una nota de crédito (devolución total) sobre una venta de servicio:
   *  - Anula las citas futuras pendientes (estado_id = 9 Anulada, flg_activo = 0)
   *    → el horario queda libre en la agenda para otro paciente.
   *  - Consume el saldo de sesiones sin asignar (sesiones_usadas = sesiones_totales)
   *    → ya no se pueden agendar.
   *  - Guarda la nota de crédito con el monto devuelto.
   */
  async crearNotaCredito(id: number, dto: CreateNotaCreditoDto) {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const venta = await manager.findOne(VentaServicio, {
        where: { id },
        relations: ['detalles'],
      });
      if (!venta) throw new NotFoundException(`Venta de servicio ${id} no encontrada`);

      const notaExistente = await manager.findOne(NotaCredito, { where: { venta_servicio_id: id } });
      if (notaExistente) {
        throw new BadRequestException(
          `Esta venta ya tiene una nota de crédito registrada (${notaExistente.codigo ?? '#' + notaExistente.id}).`,
        );
      }

      // Resolver el id del estado "Anulada" (por nombre, con fallback a 9)
      const [estadoAnulada] = await manager.query(
        `SELECT id FROM estado_cita WHERE nombre = 'Anulada' LIMIT 1`,
      );
      const estadoAnuladaId = estadoAnulada?.id ?? 9;

      const detalleIds = venta.detalles.map(d => d.id);

      // 1) Anular citas futuras pendientes → liberar agenda
      let citasAnuladas = 0;
      const pacientesServicios: Array<{ paciente_id: number; servicio_id: number }> = [];
      if (detalleIds.length > 0) {
        const citasPendientes = await manager.query(
          `SELECT id, paciente_id, servicio_id
             FROM citas
            WHERE venta_servicio_detalle_id IN (?)
              AND flg_activo = 1
              AND estado_id NOT IN (${this.ESTADOS_CITA_NO_PENDIENTE.join(',')})`,
          [detalleIds],
        );

        if (citasPendientes.length > 0) {
          const idsCitas = citasPendientes.map((c: any) => c.id);
          await manager.query(
            `UPDATE citas
                SET estado_id = ?, flg_activo = 0, user_id_actua = ?, fecha_actua = NOW()
              WHERE id IN (?)`,
            [estadoAnuladaId, dto.user_crea_id ?? null, idsCitas],
          );
          citasAnuladas = citasPendientes.length;
          for (const c of citasPendientes) {
            if (c.paciente_id && c.servicio_id) {
              pacientesServicios.push({ paciente_id: c.paciente_id, servicio_id: c.servicio_id });
            }
          }
        }
      }

      // 2) Consumir el saldo de sesiones sin asignar (no reagendables)
      const sesionesSinAsignar = venta.detalles.reduce(
        (s, d) => s + Math.max(0, Number(d.sesiones_totales) - Number(d.sesiones_usadas)),
        0,
      );
      if (sesionesSinAsignar > 0) {
        await manager.query(
          `UPDATE venta_servicio_detalle
              SET sesiones_usadas = sesiones_totales
            WHERE venta_id = ? AND sesiones_usadas < sesiones_totales`,
          [id],
        );
      }

      // 3) Registrar la nota de crédito
      const codigo = await this.comprobanteService.generarCodigoNotaCredito(manager);
      const fecha = dto.fecha ?? new Date().toISOString().split('T')[0];

      const nota = manager.create(NotaCredito, {
        codigo,
        venta_servicio_id: id,
        fecha,
        motivo: dto.motivo ?? null,
        monto_devuelto: dto.monto_devuelto ?? 0,
        modalidad_pago_id: dto.modalidad_pago_id ?? null,
        citas_anuladas: citasAnuladas,
        sesiones_anuladas: sesionesSinAsignar,
        user_crea_id: dto.user_crea_id ?? null,
      });
      const guardada = await manager.save(nota);

      return {
        message: 'Nota de crédito registrada',
        nota_credito: guardada,
        citas_anuladas: citasAnuladas,
        sesiones_anuladas: sesionesSinAsignar,
        pacientes_servicios: pacientesServicios,
      };
    });

    // 📧 Correo a info@/rrhh@ + 🔔 notificación al Administrador (no bloquea la respuesta)
    this.notificarDevolucion(resultado).catch((e) =>
      console.error('No se pudo notificar la devolución:', e?.message || e),
    );

    return resultado;
  }

  /** Envía el correo (info@/rrhh@) y la notificación in-app (Administrador) de una devolución. */
  private async notificarDevolucion(resultado: any): Promise<void> {
    const nota = await this.notaCreditoRepo.findOne({
      where: { id: resultado.nota_credito.id },
      relations: ['venta', 'venta.paciente', 'venta.responsable', 'venta.comprador_externo', 'modalidad_pago', 'user_crea'],
    });
    if (!nota) return;
    const v: any = (nota as any).venta;
    const cliente = v?.paciente
      ? `${v.paciente.nombres} ${v.paciente.apellido_paterno} ${v.paciente.apellido_materno || ''}`.trim()
      : v?.responsable
        ? `${v.responsable.nombres} ${v.responsable.apellido_paterno} ${v.responsable.apellido_materno || ''}`.trim()
        : v?.comprador_externo?.nombre || '—';
    const registradaPor = (nota as any).user_crea
      ? `${(nota as any).user_crea.nombres} ${(nota as any).user_crea.apellidos}`.trim()
      : null;

    await this.mailService.enviarCorreoNotaCredito({
      codigo: nota.codigo,
      ventaCodigo: v?.codigo_comprobante ?? null,
      clienteNombre: cliente,
      montoDevuelto: Number(nota.monto_devuelto),
      metodoPago: (nota as any).modalidad_pago?.nombre ?? null,
      motivo: nota.motivo,
      citasAnuladas: resultado.citas_anuladas,
      sesionesAnuladas: resultado.sesiones_anuladas,
      registradaPor,
      fecha: nota.fecha,
    });

    // 🔔 Notificación in-app al Administrador
    if (nota.user_crea_id) {
      await this.notificacionesService.notificarNotaCredito(
        nota.id,
        nota.user_crea_id,
        nota.codigo,
        cliente,
        Number(nota.monto_devuelto),
        resultado.citas_anuladas,
        resultado.sesiones_anuladas,
        registradaPor ?? undefined,
      );
    }
  }

  /** Valida (aprueba) una nota de crédito, dejando constancia de quién y cuándo. */
  async validarNotaCredito(notaId: number, userId: number) {
    const nota = await this.notaCreditoRepo.findOne({ where: { id: notaId } });
    if (!nota) throw new NotFoundException(`Nota de crédito #${notaId} no encontrada`);
    if (!nota.validado) {
      await this.notaCreditoRepo.update(notaId, {
        validado: true,
        validado_por: userId,
        validado_at: new Date(),
      });
    }
    return this.notaCreditoRepo.findOne({
      where: { id: notaId },
      relations: ['modalidad_pago', 'user_crea', 'validado_por_trabajador'],
    });
  }

  // ── Helpers privados ──────────────────────────────────────────────────────────

  private calcularDetalle(d: DetalleVentaServicioDto & { precio_unitario: number; tipo_item_venta?: number; motivo_cita_id?: number; descripcion_linea?: string; documento_tarifa_id?: number }) {
    // Para ítems de paquete combo, precio_unitario ya es el total (no se multiplica por sesiones)
    const subtotalSinDescuento = d.paquete_combo_id
      ? d.precio_unitario
      : d.precio_unitario * d.sesiones_totales;
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