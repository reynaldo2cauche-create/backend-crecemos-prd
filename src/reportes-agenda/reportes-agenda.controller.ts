import { Controller, Post } from '@nestjs/common';
import { ReportesAgendaService } from './reportes-agenda.service';

@Controller('backend_api/reportes-agenda')
export class ReportesAgendaController {
  constructor(private readonly service: ReportesAgendaService) {}

  /**
   * ⚠️ ENDPOINT DE PRUEBA — dispara el envío del reporte al instante.
   * Respeta el candado diario (NO usa force) para que probar no genere un
   * correo duplicado si el reporte del día ya se envió. Solo por POST: se quitó
   * el GET porque era browsable/crawleable y forzaba envíos saltándose el candado.
   */
  @Post('test')
  async test() {
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
