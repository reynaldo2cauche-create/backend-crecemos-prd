import { Controller, Post, Get } from '@nestjs/common';
import { ReportesAgendaService } from './reportes-agenda.service';

@Controller('backend_api/reportes-agenda')
export class ReportesAgendaController {
  constructor(private readonly service: ReportesAgendaService) {}

  /**
   * ⚠️ ENDPOINT DE PRUEBA — dispara el envío del reporte al instante,
   * sin esperar a las 7 PM. Quitar cuando ya esté validado.
   */
  @Post('test')
  async test() {
    return this.ejecutar();
  }

  // También por GET para poder probarlo desde el navegador
  @Get('test')
  async testGet() {
    return this.ejecutar();
  }

  private async ejecutar() {
    try {
      const resultado = await this.service.enviarReporteDiario();
      return { ok: true, ...resultado };
    } catch (e: any) {
      // Devolver el error real (SMTP, etc.) para poder diagnosticar desde la consola
      return {
        ok: false,
        error: e?.message || String(e),
        code: e?.code,
        command: e?.command,
        response: e?.response,
      };
    }
  }
}
