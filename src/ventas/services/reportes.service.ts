import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VentaProducto } from '../entities/venta-producto.entity';
import { VentaServicio } from '../entities/venta-servicio.entity';
import { AreaServicio } from '../../catalogos/area-servicio.entity';
import { TipoReporte, ReporteParams, Metricas, VentaDia, TopItem, DescuentoPorTipo, IngresoResponsable, CitasTerapeuta, CitasTerapeutaHistorico, PeriodoHistorico, FilaCitasHistorico, PacientesRegistradosHistorico, FilaPacientesHistorico, PacienteInactivadoDetalle } from '../types/reportes.types';

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
    @InjectRepository(AreaServicio)
    private readonly areaServicioRepo: Repository<AreaServicio>,
  ) {}

  async generarReporte(params: ReporteParams) {
    const { fechaInicio, fechaFin, tipo } = params;

    const [metricas, ventasPorDia, topItems, descuentos, ingresosPorResponsable, citasPorTerapeuta] =
      await Promise.all([
        this.calcularMetricas(fechaInicio, fechaFin, tipo),
        this.getVentasPorDia(fechaInicio, fechaFin, tipo),
        this.getTopItems(fechaInicio, fechaFin, tipo),
        this.getDescuentos(fechaInicio, fechaFin, tipo),
        this.getIngresosPorResponsable(fechaInicio, fechaFin, tipo),
        this.getCitasPorTerapeuta(fechaInicio, fechaFin),
      ]);

    return { metricas, ventasPorDia, topItems, descuentos, ingresosPorResponsable, citasPorTerapeuta };
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

    const descuentosCabecera = round2(
      [...productos, ...servicios].reduce((s, v) => s + toNum(v.descuento_monto), 0),
    );

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

    const { sesionesTotalesVendidas, sesionesUsadas, sesionesPendientes } = (servicios as any[]).reduce(
      (acc: { sesionesTotalesVendidas: number; sesionesUsadas: number; sesionesPendientes: number }, v: any) => {
        const detalles: any[] = v.detalles ?? [];
        for (const d of detalles) {
          if (!d.servicio_tarifa_id) continue;
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
    const mapa = new Map<string, { ventas: number; ingresos: number }>();

    for (const rows of resultados) {
      for (const row of rows) {
        // DATE() de MySQL puede devolver un objeto Date o un string — normalizamos a YYYY-MM-DD
        const key = row.fecha instanceof Date
          ? row.fecha.toISOString().split('T')[0]
          : String(row.fecha).split('T')[0];
        const prev = mapa.get(key) ?? { ventas: 0, ingresos: 0 };
        mapa.set(key, {
          ventas:   prev.ventas   + Number(row.ventas),
          ingresos: prev.ingresos + toNum(row.ingresos),
        });
      }
    }

    // Devuelve YYYY-MM-DD — el frontend se encarga de formatear para mostrar y para Excel
    return this.generarRangoDeFechas(fechaInicio, fechaFin).map((fecha) => {
      const data = mapa.get(fecha) ?? { ventas: 0, ingresos: 0 };
      return { fecha, ventas: data.ventas, ingresos: round2(data.ingresos) };
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
              LIMIT 10`,
          [fechaInicio, fechaFin],
        ),
      );
    }

    const resultados = await Promise.all(queries);

    return resultados
      .flat()
      .sort((a, b) => Number(b.cantidad) - Number(a.cantidad))
      .slice(0, 5)
      .map((item) => ({
        nombre:   item.nombre as string,
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
          monto:    prev.monto    + toNum(row.monto),
          cantidad: prev.cantidad + Number(row.cantidad),
        });
      }
    }

    return Array.from(mapa.entries()).map(([nombre, data]) => ({
      nombre,
      monto:    round2(data.monto),
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
          ventas:   prev.ventas   + Number(row.ventas),
          ingresos: prev.ingresos + toNum(row.ingresos),
        });
      }
    }

    return Array.from(mapa.entries())
      .map(([nombre, data]) => ({ nombre, ventas: data.ventas, ingresos: round2(data.ingresos) }))
      .sort((a, b) => b.ingresos - a.ingresos);
  }

  // ── Citas por terapeuta (vs período anterior) ─────────────────────────────

  private async getCitasPorTerapeuta(
    fechaInicio: string,
    fechaFin: string,
  ): Promise<CitasTerapeuta[]> {
    // Período anterior: mismo número de días justo antes del inicio (igual que el crecimiento)
    const dias = Math.ceil(
      (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 86_400_000,
    );
    const inicioAnterior = new Date(new Date(fechaInicio).getTime() - dias * 86_400_000)
      .toISOString()
      .split('T')[0];
    const finAnterior = new Date(new Date(fechaInicio).getTime() - 86_400_000)
      .toISOString()
      .split('T')[0];

    const sql = `
      SELECT c.doctor_id AS terapeuta_id,
             TRIM(CONCAT(COALESCE(t.nombres, ''), ' ', COALESCE(t.apellidos, ''))) AS nombre,
             COUNT(*) AS citas
      FROM citas c
      INNER JOIN trabajador_centro t ON t.id = c.doctor_id
      WHERE c.flg_activo = 1
        AND c.doctor_id IS NOT NULL
        AND c.fecha >= ? AND c.fecha <= ?
      GROUP BY c.doctor_id, nombre`;

    const [actuales, anteriores] = await Promise.all([
      this.ventaServicioRepo.query(sql, [fechaInicio, fechaFin]),
      this.ventaServicioRepo.query(sql, [inicioAnterior, finAnterior]),
    ]);

    const mapaAnterior = new Map<number, number>();
    for (const row of anteriores) {
      mapaAnterior.set(Number(row.terapeuta_id), Number(row.citas));
    }

    const mapa = new Map<number, { nombre: string; citas: number; citasAnterior: number }>();
    for (const row of actuales) {
      const id = Number(row.terapeuta_id);
      mapa.set(id, {
        nombre: row.nombre,
        citas: Number(row.citas),
        citasAnterior: mapaAnterior.get(id) ?? 0,
      });
    }
    // Terapeutas que tuvieron citas antes pero ninguna ahora (decrecimiento a 0)
    for (const row of anteriores) {
      const id = Number(row.terapeuta_id);
      if (!mapa.has(id)) {
        mapa.set(id, { nombre: row.nombre, citas: 0, citasAnterior: Number(row.citas) });
      }
    }

    return Array.from(mapa.values())
      .map(d => {
        const variacion =
          d.citasAnterior === 0
            ? (d.citas > 0 ? 100 : 0)
            : Math.round(((d.citas - d.citasAnterior) / d.citasAnterior) * 1000) / 10;
        return { nombre: d.nombre, citas: d.citas, citasAnterior: d.citasAnterior, variacion };
      })
      .sort((a, b) => b.citas - a.citas);
  }

  // ── Histórico de citas por terapeuta (matriz multi-período) ───────────────
  // Si el rango seleccionado es ~mensual → 6 meses terminando en el mes filtrado.
  // Si el rango es ~anual → el año filtrado y el año anterior.

  async getCitasPorTerapeutaHistorico(
    fechaInicio: string,
    fechaFin: string,
  ): Promise<CitasTerapeutaHistorico> {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    const dias = Math.round((fin.getTime() - inicio.getTime()) / 86_400_000);
    const esAnual = dias >= 180; // un filtro anual abarca ~365 días; uno mensual ~30

    const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const pad = (n: number) => String(n).padStart(2, '0');

    let periodos: PeriodoHistorico[] = [];
    let rangoInicio: string;
    let rangoFin: string;
    let formatoSql: string; // DATE_FORMAT de MySQL

    if (esAnual) {
      const anioAncla = fin.getFullYear();
      const anios = [anioAncla - 1, anioAncla];
      periodos = anios.map((a) => ({ key: String(a), label: String(a) }));
      rangoInicio = `${anios[0]}-01-01`;
      rangoFin = `${anioAncla}-12-31`;
      formatoSql = '%Y';
    } else {
      const anclaAnio = fin.getFullYear();
      const anclaMes = fin.getMonth(); // 0-based
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anclaAnio, anclaMes - i, 1);
        periodos.push({
          key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
          label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
        });
      }
      const primero = new Date(anclaAnio, anclaMes - 5, 1);
      const ultimo = new Date(anclaAnio, anclaMes + 1, 0); // último día del mes ancla
      rangoInicio = `${primero.getFullYear()}-${pad(primero.getMonth() + 1)}-01`;
      rangoFin = `${ultimo.getFullYear()}-${pad(ultimo.getMonth() + 1)}-${pad(ultimo.getDate())}`;
      formatoSql = '%Y-%m';
    }

    // formatoSql es una constante interna controlada, no entrada del usuario → seguro interpolarlo
    const sql = `
      SELECT c.doctor_id AS terapeuta_id,
             TRIM(CONCAT(COALESCE(t.nombres, ''), ' ', COALESCE(t.apellidos, ''))) AS nombre,
             DATE_FORMAT(c.fecha, '${formatoSql}') AS periodo,
             COUNT(*) AS citas
      FROM citas c
      INNER JOIN trabajador_centro t ON t.id = c.doctor_id
      WHERE c.flg_activo = 1
        AND c.doctor_id IS NOT NULL
        AND c.fecha >= ? AND c.fecha <= ?
      GROUP BY c.doctor_id, nombre, periodo`;

    const rows = await this.ventaServicioRepo.query(sql, [rangoInicio, rangoFin]);

    const mapa = new Map<number, { nombre: string; valores: Record<string, number> }>();
    for (const row of rows) {
      const id = Number(row.terapeuta_id);
      if (!mapa.has(id)) mapa.set(id, { nombre: row.nombre, valores: {} });
      mapa.get(id)!.valores[String(row.periodo)] = Number(row.citas);
    }

    const keys = periodos.map((p) => p.key);
    const ultimoKey = keys[keys.length - 1];
    const penultimoKey = keys[keys.length - 2];

    const filas: FilaCitasHistorico[] = Array.from(mapa.entries())
      .map(([id, data]) => {
        const valores: Record<string, number> = {};
        let total = 0;
        for (const k of keys) {
          const v = data.valores[k] ?? 0;
          valores[k] = v;
          total += v;
        }
        const actual = valores[ultimoKey] ?? 0;
        const previo = penultimoKey ? valores[penultimoKey] ?? 0 : 0;
        const crecimiento =
          previo === 0
            ? actual > 0
              ? 100
              : 0
            : Math.round(((actual - previo) / previo) * 1000) / 10;
        return { terapeuta_id: id, nombre: data.nombre, valores, total, crecimiento };
      })
      .sort((a, b) => b.total - a.total);

    return { modo: esAnual ? 'anual' : 'mensual', periodos, filas };
  }

  // ── Pacientes registrados (histórico por servicio) ────────────────────────
  // Mismo formato que "citas por terapeuta": mensual (últimos 6 meses + actual)
  // o anual (este año vs el anterior). Filas = servicio del paciente.
  async getPacientesRegistradosHistorico(
    fechaInicio: string,
    fechaFin: string,
  ): Promise<PacientesRegistradosHistorico> {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    const dias = Math.round((fin.getTime() - inicio.getTime()) / 86_400_000);
    const esAnual = dias >= 180;

    const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const pad = (n: number) => String(n).padStart(2, '0');

    let periodos: PeriodoHistorico[] = [];
    let rangoInicio: string;
    let rangoFin: string;
    let formatoSql: string;

    if (esAnual) {
      const anioAncla = fin.getFullYear();
      const anios = [anioAncla - 1, anioAncla];
      periodos = anios.map((a) => ({ key: String(a), label: String(a) }));
      rangoInicio = `${anios[0]}-01-01`;
      rangoFin = `${anioAncla}-12-31`;
      formatoSql = '%Y';
    } else {
      const anclaAnio = fin.getFullYear();
      const anclaMes = fin.getMonth();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anclaAnio, anclaMes - i, 1);
        periodos.push({
          key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
          label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
        });
      }
      const primero = new Date(anclaAnio, anclaMes - 5, 1);
      const ultimo = new Date(anclaAnio, anclaMes + 1, 0);
      rangoInicio = `${primero.getFullYear()}-${pad(primero.getMonth() + 1)}-01`;
      rangoFin = `${ultimo.getFullYear()}-${pad(ultimo.getMonth() + 1)}-${pad(ultimo.getDate())}`;
      formatoSql = '%Y-%m';
    }

    // Nombres de tabla resueltos por metadata (evita adivinar mayúsc/min en MySQL)
    const areaTable = this.areaServicioRepo.metadata.tableName;

    // formatoSql y areaTable son valores internos controlados → seguro interpolarlos
    const sql = `
      SELECT COALESCE(s.id, 0) AS servicio_id,
             COALESCE(s.nombre, 'Sin servicio') AS servicio_nombre,
             COALESCE(a.nombre, '') AS area_nombre,
             DATE_FORMAT(p.created_at, '${formatoSql}') AS periodo,
             COUNT(*) AS total
      FROM paciente p
      LEFT JOIN servicios s ON s.id = p.servicio_id
      LEFT JOIN \`${areaTable}\` a ON a.id = s.area_id
      WHERE DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?
      GROUP BY servicio_id, servicio_nombre, area_nombre, periodo`;

    const rows = await this.ventaServicioRepo.query(sql, [rangoInicio, rangoFin]);

    // La clave agrupa por servicio (que ya es único por área), el nombre incluye el área
    // para distinguir servicios homónimos de distintas áreas.
    const mapa = new Map<string, { nombre: string; valores: Record<string, number> }>();
    for (const row of rows) {
      const id = Number(row.servicio_id);
      const area = (row.area_nombre || '').trim();
      const nombre = area ? `${row.servicio_nombre} — ${area}` : row.servicio_nombre;
      const clave = `${id}`;
      if (!mapa.has(clave)) mapa.set(clave, { nombre, valores: {} });
      mapa.get(clave)!.valores[String(row.periodo)] = Number(row.total);
    }

    const keys = periodos.map((p) => p.key);
    const ultimoKey = keys[keys.length - 1];
    const penultimoKey = keys[keys.length - 2];

    const totalesPorPeriodo: Record<string, number> = {};
    for (const k of keys) totalesPorPeriodo[k] = 0;

    const filas: FilaPacientesHistorico[] = Array.from(mapa.entries())
      .map(([clave, data]) => {
        const valores: Record<string, number> = {};
        let total = 0;
        for (const k of keys) {
          const v = data.valores[k] ?? 0;
          valores[k] = v;
          total += v;
          totalesPorPeriodo[k] += v;
        }
        const actual = valores[ultimoKey] ?? 0;
        const previo = penultimoKey ? valores[penultimoKey] ?? 0 : 0;
        const crecimiento =
          previo === 0 ? (actual > 0 ? 100 : 0) : Math.round(((actual - previo) / previo) * 1000) / 10;
        return { servicio_id: Number(clave), nombre: data.nombre, valores, total, crecimiento };
      })
      .sort((a, b) => b.total - a.total);

    const totalGeneral = Object.values(totalesPorPeriodo).reduce((a, b) => a + b, 0);

    return { modo: esAnual ? 'anual' : 'mensual', periodos, filas, totalesPorPeriodo, totalGeneral };
  }

  // ── Pacientes inactivados (lista detallada según el filtro de fechas) ──────
  // Pacientes en estado Inactivo (estado_paciente_id = 5) cuya inactivación
  // (última actualización) cae dentro del rango, con su servicio y área.
  async getPacientesInactivadosDetalle(
    fechaInicio: string,
    fechaFin: string,
  ): Promise<PacienteInactivadoDetalle[]> {
    const areaTable = this.areaServicioRepo.metadata.tableName;
    const sql = `
      SELECT p.id,
             TRIM(CONCAT(COALESCE(p.nombres, ''), ' ', COALESCE(p.apellido_paterno, ''), ' ', COALESCE(p.apellido_materno, ''))) AS nombre,
             p.numero_documento AS documento,
             COALESCE(s.nombre, 'Sin servicio') AS servicio,
             COALESCE(a.nombre, '') AS area,
             p.updated_at AS fecha_inactivacion
      FROM paciente p
      LEFT JOIN servicios s ON s.id = p.servicio_id
      LEFT JOIN \`${areaTable}\` a ON a.id = s.area_id
      WHERE p.estado_paciente_id = 5
        AND DATE(p.updated_at) >= ? AND DATE(p.updated_at) <= ?
      ORDER BY p.updated_at DESC`;
    return this.ventaServicioRepo.query(sql, [fechaInicio, fechaFin]);
  }

  // ── Ventas sin cita agendada ──────────────────────────────────────────────

  async getVentasSinCita(): Promise<any[]> {
    return this.ventaServicioRepo.query(`
      SELECT
        vs.id                  AS venta_id,
        vs.codigo_comprobante,
        vs.fecha_venta,
        vsd.id                 AS detalle_id,
        vsd.descripcion_linea,
        vsd.sesiones_totales,
        COUNT(c.id)            AS sesiones_agendadas,
        (vsd.sesiones_totales - COUNT(c.id)) AS sesiones_pendientes,
        CONCAT(
          p.nombres, ' ', p.apellido_paterno,
          IF(p.apellido_materno IS NOT NULL AND p.apellido_materno != '',
            CONCAT(' ', p.apellido_materno), '')
        ) AS paciente,
        mc.nombre AS motivo_cita
      FROM venta_servicio_detalle vsd
      INNER JOIN venta_servicio vs ON vs.id = vsd.venta_id
      LEFT JOIN paciente p ON p.id = vsd.paciente_id
      LEFT JOIN motivo_cita mc ON mc.id = vsd.motivo_cita_id
      LEFT JOIN citas c 
        ON c.venta_servicio_detalle_id = vsd.id
        AND c.flg_activo = 1
      WHERE vsd.tipo_item_venta = 1
      GROUP BY vsd.id
      HAVING sesiones_pendientes > 0
      ORDER BY vs.fecha_venta DESC, vs.id DESC
      LIMIT 300
    `);
  }

  // ── Paquetes por renovar (un paquete vendido = una fila, criterio por fecha) ─
  // Base = paquetes vendidos (venta_servicio_detalle). Cada fila es UN paquete:
  //   - Combo: se agrupan todas las líneas con el mismo paquete_combo_id
  //     (evaluación + informe verbal, etc. → un solo paquete).
  //   - Suelto: se agrupa por motivo de cita dentro de la venta.
  // Un paquete aparece como "por renovar" cuando (criterio POR FECHA, no por
  // asistencia):
  //   1) El paciente está activo EN ESE servicio: paciente_servicio con
  //      activo = 1, estado = 'ACTIVO' y estado_paciente_id <> 5. Excluye
  //      INACTIVO y FINALIZADO. El estado es por servicio, no global.
  //   2) El paquete tiene al menos una cita y la fecha de su ÚLTIMA cita ya
  //      llegó (ultima_cita_fecha <= hoy).
  //   3) El paciente NO tiene ninguna cita futura (fecha > hoy) en ese servicio
  //      → si tiene algo agendado más adelante ya renovó / sigue → no aparece.
  // Las citas canceladas/eliminadas son soft-delete (flg_activo = 0), así que
  // se ignoran automáticamente. La hora/asistencia ya no importa: manda la fecha.
  async getPaquetesPorRenovar(): Promise<any[]> {
    const areaTable = this.areaServicioRepo.metadata.tableName;
    return this.ventaServicioRepo.query(`
      SELECT
        base.grupo_id,
        base.paciente_id,
        base.paciente,
        base.documento,
        base.servicio_id,
        base.servicio,
        base.area,
        base.sesiones_totales,
        base.ultima_venta,
        base.ultima_cita_fecha,
        (SELECT mc.nombre
           FROM citas c2
           LEFT JOIN motivo_cita mc ON mc.id = c2.motivo_id
           WHERE c2.paciente_id = base.paciente_id
             AND c2.servicio_id = base.servicio_id
             AND c2.flg_activo = 1
           ORDER BY c2.fecha DESC, c2.hora_inicio DESC
           LIMIT 1) AS ultima_cita_motivo
      FROM (
        SELECT
          CONCAT(d.venta_id, '-', st.servicio_id, '-', d.grupo_key) AS grupo_id,
          p.id AS paciente_id,
          CONCAT(
            p.nombres, ' ', p.apellido_paterno,
            IF(p.apellido_materno IS NOT NULL AND p.apellido_materno != '',
              CONCAT(' ', p.apellido_materno), '')
          ) AS paciente,
          p.numero_documento AS documento,
          st.servicio_id AS servicio_id,
          COALESCE(s.nombre, 'Sin servicio') AS servicio,
          COALESCE(a.nombre, '') AS area,
          SUM(d.sesiones_totales)                              AS sesiones_totales,
          SUM(d.citas_count)                                   AS citas_count,
          MAX(d.fecha_venta)                                   AS ultima_venta,
          MAX(d.ultima_cita_fecha)                             AS ultima_cita_fecha
        FROM (
          SELECT
            vsd.id               AS detalle_id,
            vsd.venta_id,
            vsd.paciente_id,
            vsd.servicio_tarifa_id,
            vsd.paquete_combo_id,
            vsd.motivo_cita_id,
            vsd.sesiones_totales,
            vs.fecha_venta,
            CASE WHEN vsd.paquete_combo_id IS NOT NULL
                 THEN CONCAT('c', vsd.paquete_combo_id)
                 ELSE CONCAT('m', COALESCE(vsd.motivo_cita_id, 0)) END AS grupo_key,
            (SELECT COUNT(*) FROM citas c
               WHERE c.venta_servicio_detalle_id = vsd.id AND c.flg_activo = 1) AS citas_count,
            (SELECT MAX(c.fecha) FROM citas c
               WHERE c.venta_servicio_detalle_id = vsd.id AND c.flg_activo = 1) AS ultima_cita_fecha
          FROM venta_servicio_detalle vsd
          INNER JOIN venta_servicio vs ON vs.id = vsd.venta_id
          WHERE vsd.tipo_item_venta = 1
            AND vsd.servicio_tarifa_id IS NOT NULL
        ) d
        INNER JOIN servicio_tarifa st ON st.id = d.servicio_tarifa_id
        INNER JOIN paciente p ON p.id = d.paciente_id
        LEFT JOIN servicios s ON s.id = st.servicio_id
        LEFT JOIN \`${areaTable}\` a ON a.id = s.area_id
        WHERE EXISTS (
          SELECT 1 FROM paciente_servicio ps
          WHERE ps.paciente_id = p.id
            AND ps.servicio_id = st.servicio_id
            AND ps.activo = 1
            AND ps.estado = 'ACTIVO'
            AND COALESCE(ps.estado_paciente_id, 0) <> 5
        )
        AND NOT EXISTS (
          SELECT 1 FROM citas cf
          WHERE cf.paciente_id = p.id
            AND cf.servicio_id = st.servicio_id
            AND cf.flg_activo = 1
            AND cf.fecha > CURDATE()
        )
        GROUP BY d.venta_id, st.servicio_id, d.grupo_key,
                 p.id, p.numero_documento, p.nombres, p.apellido_paterno,
                 p.apellido_materno, s.nombre, a.nombre
      ) base
      WHERE base.citas_count > 0
        AND base.ultima_cita_fecha <= CURDATE()
      ORDER BY base.ultima_cita_fecha DESC
      LIMIT 500
    `);
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
    const actual = new Date(inicio + 'T00:00:00'); // fuerza hora local, evita desfase UTC
    const final  = new Date(fin   + 'T00:00:00');
    while (actual <= final) {
      fechas.push(actual.toISOString().split('T')[0]);
      actual.setDate(actual.getDate() + 1);
    }
    return fechas;
  }
}