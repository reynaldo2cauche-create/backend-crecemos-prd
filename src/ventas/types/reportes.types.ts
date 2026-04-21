export type TipoReporte = 'general' | 'productos' | 'servicios';

export interface ReporteParams {
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoReporte;
}

export interface Metricas {
  totalVentas: number;
  totalIngresos: number;
  ventasProductos: number;
  ventasServicios: number;
  ticketPromedio: number;
  crecimiento: number;
  totalDescuentos: number;
  totalDescuentosPromo: number;
  sesionesTotalesVendidas: number;
  sesionesUsadas: number;
  sesionesPendientes: number;
}

export interface VentaDia {
  fecha: string;
  ventas: number;
  ingresos: number;
}

export interface TopItem {
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface DescuentoPorTipo {
  nombre: string;
  monto: number;
  cantidad: number;
}

export interface IngresoResponsable {
  nombre: string;
  ventas: number;
  ingresos: number;
}