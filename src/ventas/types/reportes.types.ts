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

export interface CitasTerapeuta {
  nombre: string;
  citas: number;          // cantidad de citas en el período actual
  citasAnterior: number;  // cantidad de citas en el período anterior (mismo nº de días)
  variacion: number;      // % de crecimiento (+) o decrecimiento (-) vs período anterior
}

// ── Histórico de citas por terapeuta (matriz multi-período) ──────────────────

export interface PeriodoHistorico {
  key: string;   // '2026-01' (mensual) o '2026' (anual)
  label: string; // 'Ene 2026' (mensual) o '2026' (anual)
}

export interface FilaCitasHistorico {
  terapeuta_id: number;
  nombre: string;
  valores: Record<string, number>; // key de período -> nº de citas
  total: number;                    // suma de todos los períodos
  crecimiento: number;              // % del último período vs el anterior
}

export interface CitasTerapeutaHistorico {
  modo: 'mensual' | 'anual';
  periodos: PeriodoHistorico[];     // ordenados del más antiguo al más reciente
  filas: FilaCitasHistorico[];
}

export interface FilaPacientesHistorico {
  servicio_id: number;
  nombre: string;
  valores: Record<string, number>; // key de período -> nº de pacientes registrados
  total: number;                    // suma de todos los períodos
  crecimiento: number;              // % del último período vs el anterior
}

export interface PacientesRegistradosHistorico {
  modo: 'mensual' | 'anual';
  periodos: PeriodoHistorico[];     // ordenados del más antiguo al más reciente
  filas: FilaPacientesHistorico[];  // filas por servicio
  totalesPorPeriodo: Record<string, number>; // total de registros por período
  totalGeneral: number;             // total de pacientes registrados en el rango
}

export interface PacienteInactivadoDetalle {
  id: number;
  nombre: string;
  documento: string;
  servicio: string;
  area: string;
  fecha_inactivacion: string;
}