import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportesService } from '../services/reportes.service';
import { TipoReporte } from '../types/reportes.types';

@Controller('backend_api/ventas/reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('sin-cita')
  getVentasSinCita() {
    return this.reportesService.getVentasSinCita();
  }

  @Get('citas-historico')
  getCitasHistorico(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ) {
    return this.reportesService.getCitasPorTerapeutaHistorico(fechaInicio, fechaFin);
  }

  @Get()
  async getReportes(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.reportesService.generarReporte({
      fechaInicio,
      fechaFin,
      tipo: (tipo as TipoReporte) ?? 'general',
    });
  }
}