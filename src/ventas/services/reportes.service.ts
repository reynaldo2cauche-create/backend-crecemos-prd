import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VentaProducto } from '../entities/venta-producto.entity';
import { VentaServicio } from '../entities/venta-servicio.entity';
import { TipoReporte, ReporteParams, Metricas, VentaDia, TopItem, DescuentoPorTipo, IngresoResponsable } from '../types/reportes.types';

function incluyeProductos(tipo: TipoReporte) {
  return tipo === 'general' || tipo === 'productos';
}

function incluyeServicios(tipo: TipoReporte) {
  return tipo === 'general' || tipo === 'servicios';
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function toNum(v: any): number {
  return parseFloat(v as any) || 0;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(VentaProducto)
    private readonly ventaProductoRepo: Repository<VentaProducto>,
    @InjectRepository(VentaServicio)
    private readonly ventaServicioRepo: Repository<VentaServicio>,
  ) {}

  async generarReporte(params: ReporteParams) {
    const { fechaInicio, fechaFin, tipo } = params;

    const [metricas, ventasPorDia, topItems, descuentos, ingresosPorResponsable] =
      await Promise.all([
        this.calcularMetricas(fechaInicio, fechaFin, tipo),
        this.getVentasPorDia(fechaInicio, fechaFin, tipo),
        this.getTopItems(fechaInicio, fechaFin, tipo),
        this.getDescuentos(fechaInicio, fechaFin, tipo),
        this.getIngresosPorResponsable(fechaInicio, fechaFin, tipo),
      ]);

    return { metricas, ventasPorDia, topItems, descuentos, ingresosPorResponsable };
  }

  // ── Métricas generales ────────────────────────────────────────────────────

  private async calcularMetricas(
    fechaInicio: string,
    fechaFin: string,
    tipo: TipoReporte,
  ): Promise<Metricas> {
    const [productos, servicios] = await Promise.all([
      incluyeProductos(tipo) ? this.queryVentasProducto(fechaInicio, fechaFin) : [],
      incluyeServicios(tipo) ? this.queryVentasServicio(fechaInicio, fechaFin) : [],
    ]);

    const ventasProductos = productos.length;
    const ventasServicios = servicios.length;
    const totalVentas = ventasProductos + ventasServicios;

    const totalIngresos = round2(
      [...productos, ...servicios].reduce((s, v) => s + toNum(v.total), 0),
    );

    // Descuentos de cabecera (venta_producto y venta_servicio)
    const descuentosCabecera = round2(
      [...productos, ...servicios].reduce((s, v) => s + toNum(v.descuento_monto), 0),
    );

    // Descuentos de detalles (venta_producto_detalle y venta_servicio_detalle)
    const descuentosDetalleProductos = (productos as any[]).reduce(
      (s: number, v: any) => s + ((v.detalles as any[])?.reduce((sd: number, d: any) => sd + toNum(d.descuento_monto), 0) ?? 0),
      0,
    );
    const descuentosDetalleServicios = (servicios as any[]).reduce(
      (s: number, v: any) => s + ((v.detalles as any[])?.reduce((sd: number, d: any) => sd + toNum(d.descuento_monto), 0) ?? 0),
      0,
    );

    const totalDescuentos = round2(descuentosCabecera + descuentosDetalleProductos + descuentosDetalleServicios);

    const totalDescuentosPromo = round2(
      [...productos, ...servicios].reduce((s, v) => s + toNum(v.descuento_promocion), 0),
    );

    // Solo detalles con servicio_tarifa_id (servicios con cita), ignorando documentos
    const { sesionesTotalesVendidas, sesionesUsadas, sesionesPendientes } = (servicios as any[]).reduce(
      (acc: { sesionesTotalesVendidas: number; sesionesUsadas: number; sesionesPendientes: number }, v: any) => {
        const detalles: any[] = v.detalles ?? [];
        for (const d of detalles) {
          if (!d.servicio_tarifa_id) continue; // ignorar documentos y combos sin tarifa
          const totales = d.sesiones_totales || 0;
          const usadas  = d.sesiones_usadas  || 0;
          acc.sesionesTotalesVendidas += totales;
          acc.sesionesUsadas          += usadas;
          acc.sesionesPendientes      += Math.max(0, totales - usadas);
        }
        return acc;
      },
      { sesionesTotalesVendidas: 0, sesionesUsadas: 0, sesionesPendientes: 0 },
    );

    const ticketPromedio = totalVentas > 0 ? round2(totalIngresos / totalVentas) : 0;
    const crecimiento = await this.calcularCrecimiento(fechaInicio, fechaFin, tipo, totalIngresos);

    return {
      totalVentas,
      totalIngresos,
      ventasProductos,
      ventasServicios,
      ticketPromedio,
      crecimiento,
      totalDescuentos,
      totalDescuentosPromo,
      sesionesTotalesVendidas,
      sesionesUsadas,
      sesionesPendientes,
    };
  }
    

  private async calcularCrecimiento(
    fechaInicio: string,
    fechaFin: string,
    tipo: TipoReporte,
    ingresosActuales: number,
  ): Promise<number> {
    const dias = Math.ceil(
      (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 86_400_000,
    );
    const inicioAnterior = new Date(new Date(fechaInicio).getTime() - dias * 86_400_000)
      .toISOString()
      .split('T')[0];
    const finAnterior = new Date(new Date(fechaInicio).getTime() - 86_400_000)
      .toISOString()
      .split('T')[0];

    const [p, s] = await Promise.all([
      incluyeProductos(tipo) ? this.queryVentasProducto(inicioAnterior, finAnterior) : [],
      incluyeServicios(tipo) ? this.queryVentasServicio(inicioAnterior, finAnterior) : [],
    ]);
    const ingresosAnteriores = [...p, ...s].reduce((sum, v) => sum + toNum(v.total), 0);

    if (ingresosAnteriores === 0) return 0;
    return Math.round(((ingresosActuales - ingresosAnteriores) / ingresosAnteriores) * 1000) / 10;
  }

  // ── Ventas por día ────────────────────────────────────────────────────────

  private async getVentasPorDia(
    fechaInicio: string,
    fechaFin: string,
    tipo: TipoReporte,
  ): Promise<VentaDia[]> {
    console.log('🔍 getVentasPorDia - Parámetros:', { fechaInicio, fechaFin, tipo });
    const queries: Promise<any[]>[] = [];

    if (incluyeProductos(tipo)) {
      queries.push(
        this.ventaProductoRepo.query(
          `SELECT DATE(fecha_venta) as fecha,
                  COUNT(*) as ventas,
                  SUM(total) as ingresos
           FROM venta_producto
           WHERE DATE(fecha_venta) >= ? AND DATE(fecha_venta) <= ?
           GROUP BY DATE(fecha_venta)
           ORDER BY fecha`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    if (incluyeServicios(tipo)) {
      queries.push(
        this.ventaServicioRepo.query(
          `SELECT DATE(fecha_venta) as fecha,
                  COUNT(*) as ventas,
                  SUM(total) as ingresos
           FROM venta_servicio
           WHERE DATE(fecha_venta) >= ? AND DATE(fecha_venta) <= ?
           GROUP BY DATE(fecha_venta)
           ORDER BY fecha`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    const resultados = await Promise.all(queries);
    console.log('📊 Resultados SQL crudos:', resultados);
    const mapa = new Map<string, { ventas: number; ingresos: number }>();

    for (const rows of resultados) {
      console.log('📝 Procesando rows:', rows);
      for (const row of rows) {
        // Convertir Date object a string ISO format YYYY-MM-DD
        const key = row.fecha instanceof Date
          ? row.fecha.toISOString().split('T')[0]
          : String(row.fecha).split('T')[0];
        const prev = mapa.get(key) ?? { ventas: 0, ingresos: 0 };
        mapa.set(key, {
          ventas: prev.ventas + Number(row.ventas),
          ingresos: prev.ingresos + toNum(row.ingresos),
        });
      }
    }

    console.log('🗺️ Mapa final:', Array.from(mapa.entries()));
    return this.generarRangoDeFechas(fechaInicio, fechaFin).map((fecha) => {
      const data = mapa.get(fecha) ?? { ventas: 0, ingresos: 0 };
      return { fecha: this.formatearFecha(fecha), ventas: data.ventas, ingresos: round2(data.ingresos) };
    });
  }

  // ── Top productos/servicios ───────────────────────────────────────────────

  private async getTopItems(
    fechaInicio: string,
    fechaFin: string,
    tipo: TipoReporte,
  ): Promise<TopItem[]> {
    const queries: Promise<any[]>[] = [];

    if (incluyeProductos(tipo)) {
      queries.push(
        this.ventaProductoRepo.query(
          `SELECT p.nombre,
                  SUM(dvp.cantidad) as cantidad,
                  SUM(dvp.cantidad * dvp.precio_unitario - dvp.descuento_monto) as ingresos
           FROM venta_producto_detalle dvp
           INNER JOIN venta_producto vp ON vp.id = dvp.venta_id
           INNER JOIN producto p ON p.id = dvp.producto_id
           WHERE vp.fecha_venta >= ? AND vp.fecha_venta <= ?
           GROUP BY p.id, p.nombre
           ORDER BY cantidad DESC
           LIMIT 10`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    if (incluyeServicios(tipo)) {
      queries.push(
        this.ventaServicioRepo.query(
          `SELECT 
                COALESCE(s.nombre, dt.nombre, 'Servicio') AS nombre,
                SUM(dvs.sesiones_totales) AS cantidad,
                SUM(dvs.subtotal) AS ingresos
              FROM venta_servicio_detalle dvs
              INNER JOIN venta_servicio vs 
                ON vs.id = dvs.venta_id
              LEFT JOIN servicio_tarifa st 
                ON st.id = dvs.servicio_tarifa_id
              LEFT JOIN servicios s 
                ON s.id = st.servicio_id
              LEFT JOIN documento_tarifa dt 
                ON dt.id = dvs.documento_tarifa_id
              WHERE vs.fecha_venta >= ? 
                AND vs.fecha_venta <= ?
              GROUP BY COALESCE(s.nombre, dt.nombre, 'Servicio')
              ORDER BY cantidad DESC
              LIMIT 10;`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    const resultados = await Promise.all(queries);
    const todos = resultados.flat();

    return todos
      .sort((a, b) => Number(b.cantidad) - Number(a.cantidad))
      .slice(0, 5)
      .map((item) => ({
        nombre: item.nombre as string,
        cantidad: Number(item.cantidad),
        ingresos: round2(toNum(item.ingresos)),
      }));
  }

  // ── Descuentos aplicados ──────────────────────────────────────────────────

  private async getDescuentos(
    fechaInicio: string,
    fechaFin: string,
    tipo: TipoReporte,
  ): Promise<DescuentoPorTipo[]> {
    const queries: Promise<any[]>[] = [];

    if (incluyeProductos(tipo)) {
      // Descuentos de cabecera de productos
      queries.push(
        this.ventaProductoRepo.query(
          `SELECT dt.nombre,
                  SUM(vp.descuento_monto) as monto,
                  COUNT(*) as cantidad
           FROM venta_producto vp
           LEFT JOIN tipo_descuento dt ON dt.id = vp.descuento_tipo_id
           WHERE vp.fecha_venta >= ? AND vp.fecha_venta <= ?
             AND vp.descuento_monto > 0
           GROUP BY dt.id, dt.nombre`,
          [fechaInicio, fechaFin],
        ),
      );

      // Descuentos de detalle de productos
      queries.push(
        this.ventaProductoRepo.query(
          `SELECT dt.nombre,
                  SUM(dvp.descuento_monto) as monto,
                  COUNT(*) as cantidad
           FROM venta_producto_detalle dvp
           INNER JOIN venta_producto vp ON vp.id = dvp.venta_id
           LEFT JOIN tipo_descuento dt ON dt.id = dvp.descuento_tipo_id
           WHERE vp.fecha_venta >= ? AND vp.fecha_venta <= ?
             AND dvp.descuento_monto > 0
           GROUP BY dt.id, dt.nombre`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    if (incluyeServicios(tipo)) {
      // Descuentos de cabecera de servicios
      queries.push(
        this.ventaServicioRepo.query(
          `SELECT dt.nombre,
                  SUM(vs.descuento_monto) as monto,
                  COUNT(*) as cantidad
           FROM venta_servicio vs
           LEFT JOIN tipo_descuento dt ON dt.id = vs.descuento_tipo_id
           WHERE vs.fecha_venta >= ? AND vs.fecha_venta <= ?
             AND vs.descuento_monto > 0
           GROUP BY dt.id, dt.nombre`,
          [fechaInicio, fechaFin],
        ),
      );

      // Descuentos de detalle de servicios
      queries.push(
        this.ventaServicioRepo.query(
          `SELECT dt.nombre,
                  SUM(dvs.descuento_monto) as monto,
                  COUNT(*) as cantidad
           FROM venta_servicio_detalle dvs
           INNER JOIN venta_servicio vs ON vs.id = dvs.venta_id
           LEFT JOIN tipo_descuento dt ON dt.id = dvs.descuento_tipo_id
           WHERE vs.fecha_venta >= ? AND vs.fecha_venta <= ?
             AND dvs.descuento_monto > 0
           GROUP BY dt.id, dt.nombre`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    const resultados = await Promise.all(queries);
    const mapa = new Map<string, { monto: number; cantidad: number }>();

    for (const rows of resultados) {
      for (const row of rows) {
        const nombre = (row.nombre as string) ?? 'Sin tipo';
        const prev = mapa.get(nombre) ?? { monto: 0, cantidad: 0 };
        mapa.set(nombre, {
          monto: prev.monto + toNum(row.monto),
          cantidad: prev.cantidad + Number(row.cantidad),
        });
      }
    }

    return Array.from(mapa.entries()).map(([nombre, data]) => ({
      nombre,
      monto: round2(data.monto),
      cantidad: data.cantidad,
    }));
  }

  // ── Ingresos por responsable ──────────────────────────────────────────────

  private async getIngresosPorResponsable(
    fechaInicio: string,
    fechaFin: string,
    tipo: TipoReporte,
  ): Promise<IngresoResponsable[]> {
    const queries: Promise<any[]>[] = [];

    if (incluyeProductos(tipo)) {
      queries.push(
        this.ventaProductoRepo.query(
          `SELECT CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                  COUNT(*) as ventas,
                  SUM(vp.total) as ingresos
           FROM venta_producto vp
           INNER JOIN trabajador_centro u ON u.id = vp.user_crea_id
           WHERE vp.fecha_venta >= ? AND vp.fecha_venta <= ?
             AND vp.user_crea_id IS NOT NULL
           GROUP BY vp.user_crea_id, nombre`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    if (incluyeServicios(tipo)) {
      queries.push(
        this.ventaServicioRepo.query(
          `SELECT CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                  COUNT(*) as ventas,
                  SUM(vs.total) as ingresos
           FROM venta_servicio vs
           INNER JOIN trabajador_centro u ON u.id = vs.user_crea_id
           WHERE vs.fecha_venta >= ? AND vs.fecha_venta <= ?
             AND vs.user_crea_id IS NOT NULL
           GROUP BY vs.user_crea_id, nombre`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    const resultados = await Promise.all(queries);
    const mapa = new Map<string, { ventas: number; ingresos: number }>();

    for (const rows of resultados) {
      for (const row of rows) {
        const nombre = row.nombre as string;
        const prev = mapa.get(nombre) ?? { ventas: 0, ingresos: 0 };
        mapa.set(nombre, {
          ventas: prev.ventas + Number(row.ventas),
          ingresos: prev.ingresos + toNum(row.ingresos),
        });
      }
    }

    return Array.from(mapa.entries())
      .map(([nombre, data]) => ({ nombre, ventas: data.ventas, ingresos: round2(data.ingresos) }))
      .sort((a, b) => b.ingresos - a.ingresos);
  }

  // ── Queries base ──────────────────────────────────────────────────────────

  private queryVentasProducto(fechaInicio: string, fechaFin: string) {
    return this.ventaProductoRepo
      .createQueryBuilder('vp')
      .leftJoinAndSelect('vp.detalles', 'detalles')
      .where('vp.fecha_venta >= :fi', { fi: fechaInicio })
      .andWhere('vp.fecha_venta <= :ff', { ff: fechaFin })
      .getMany();
  }

  private queryVentasServicio(fechaInicio: string, fechaFin: string) {
    return this.ventaServicioRepo
      .createQueryBuilder('vs')
      .leftJoinAndSelect('vs.detalles', 'detalles')
      .where('vs.fecha_venta >= :fi', { fi: fechaInicio })
      .andWhere('vs.fecha_venta <= :ff', { ff: fechaFin })
      .getMany();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private generarRangoDeFechas(inicio: string, fin: string): string[] {
    const fechas: string[] = [];
    const actual = new Date(inicio);
    const final = new Date(fin);
    while (actual <= final) {
      fechas.push(actual.toISOString().split('T')[0]);
      actual.setDate(actual.getDate() + 1);
    }
    return fechas;
  }

  private formatearFecha(fecha: string): string {
    const [, month, day] = fecha.split('-');
    return `${day}/${month}`;
  }
}