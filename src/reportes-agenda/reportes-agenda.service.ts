import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { CitasService } from '../citas/citas.service';
import { MailService } from '../mail/mail.service';
import { ResponsablePaciente } from '../pacientes/entities/responsable-paciente.entity';
import { ReporteAgendaEnvio } from './entities/reporte-agenda-envio.entity';

const ROL_TERAPEUTA = 4;
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

type GrupoTerapeuta = { terapeuta: any; semana: any[]; manana: any[] };

@Injectable()
export class ReportesAgendaService implements OnModuleInit {
  private readonly logger = new Logger(ReportesAgendaService.name);

  constructor(
    private readonly citasService: CitasService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectRepository(ResponsablePaciente)
    private readonly responsablePacienteRepo: Repository<ResponsablePaciente>,
    @InjectRepository(ReporteAgendaEnvio)
    private readonly envioRepo: Repository<ReporteAgendaEnvio>,
  ) {}

  /**
   * Al arrancar, garantiza que exista la tabla del candado en la MISMA BD que
   * usa la app. Así el candado diario funciona aunque nunca se haya corrido la
   * migración manual en producción (una de las causas del correo doble).
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.envioRepo.manager.query(
        `CREATE TABLE IF NOT EXISTS reporte_agenda_envio (
           fecha DATE NOT NULL,
           enviado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
           PRIMARY KEY (fecha)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      );
    } catch (e: any) {
      this.logger.error(
        'No se pudo asegurar la tabla del candado (reporte_agenda_envio).',
        e?.stack || e,
      );
    }
  }

  /**
   * Se ejecuta TODOS los días a las 7:00:00 PM exactas (hora de Lima).
   * El decorador @Cron dispara una sola vez al día — no consume CPU el resto
   * del tiempo, a diferencia del antiguo setInterval que despertaba cada 10 min.
   */
  @Cron('0 19 * * *', { timeZone: 'America/Lima' })
  async verificarEnvio(): Promise<void> {
    // En un cluster (PM2), CADA worker ejecuta este @Cron. Aunque el candado en
    // BD frena al segundo, si los workers estuvieran en BD/servidores distintos
    // igual saldrían 2 correos. Por eso, además del candado, dejamos que SOLO el
    // worker designado dispare el cron: la causa raíz del "correo doble".
    if (!this.esWorkerDelCron()) {
      this.logger.log('📅 Reporte de agenda: este worker no es el designado para el cron. Se omite.');
      return;
    }

    this.logger.log('📅 Disparo programado del reporte de agenda (19:00 Lima)');
    try {
      await this.enviarReporteDiario();
    } catch (error) {
      this.logger.error('❌ Error en envío programado', error?.stack || error);
    }
  }

  /**
   * True solo en el worker que debe correr las tareas programadas.
   * En PM2 cluster cada worker recibe NODE_APP_INSTANCE (0,1,2...); dejamos que
   * solo el "0" dispare el cron. En proceso único (sin la variable) también corre.
   * Se puede forzar con CRON_WORKER=true/false si el entorno no usa PM2.
   */
  private esWorkerDelCron(): boolean {
    const override = process.env.CRON_WORKER;
    if (override === 'true') return true;
    if (override === 'false') return false;
    const instancia = process.env.NODE_APP_INSTANCE ?? process.env.pm_id;
    return instancia === undefined || instancia === '0';
  }

  /**
   * Genera y envía UN solo Excel: una hoja por terapeuta activa con su agenda
   * semanal (Lun-Sáb) y, al final de cada hoja, los recordatorios (mismo mensaje
   * que el modal de agendar cita) de las citas de mañana de ese terapeuta.
   */
  async enviarReporteDiario(opts: { force?: boolean } = {}): Promise<any> {
    this.logger.log('📅 Generando reporte diario de agenda...');

    // Candado diario: garantiza UN solo correo aunque haya varias instancias
    // del backend disparando el @Cron a la vez. La primera instancia gana el
    // INSERT; las demás reciben ER_DUP_ENTRY y se omiten. El endpoint /test
    // pasa force=true para poder probar sin quedar bloqueado.
    const hoy = this.fechaLima(0);
    if (!opts.force && !(await this.intentarClaimEnvio(hoy))) {
      this.logger.warn(`Reporte ${hoy}: ya enviado por otra instancia. Se omite.`);
      return { enviado: false, motivo: 'Ya enviado hoy (candado diario).', fecha: hoy };
    }

    try {
      return await this.generarYEnviar(opts, hoy);
    } catch (error) {
      // Si falló el envío, liberamos el candado para permitir un reintento.
      if (!opts.force) await this.liberarClaim(hoy);
      throw error;
    }
  }

  private async generarYEnviar(opts: { force?: boolean }, hoy: string): Promise<any> {
    const { lunes, sabado } = this.rangoSemana();
    const manana = this.fechaLima(1);

    // 1. Citas de la semana (Lun-Sáb) y citas de mañana, en paralelo
    const [citasSemana, citasManana] = await Promise.all([
      this.citasService.listar({ fecha_desde: lunes, fecha_hasta: sabado }),
      this.citasService.listar({ fecha_desde: manana, fecha_hasta: manana }),
    ]);

    // 2. Agrupar por terapeuta activa (semana para la grilla, mañana para recordatorios)
    const porTerapeuta = this.agruparTerapeutas(citasSemana, citasManana);

    const diag: any = {
      enviado: false,
      rangoSemana: { lunes, sabado },
      manana,
      citasSemana: citasSemana.length,
      citasManana: citasManana.length,
      terapeutasActivas: porTerapeuta.size,
      destinatarios: this.destinatarios(),
    };

    if (porTerapeuta.size === 0) {
      this.logger.warn('Sin terapeutas activas con citas. No se envía correo.');
      // No hubo envío: liberamos el candado (el candado solo debe representar
      // "correo realmente enviado").
      if (!opts.force) await this.liberarClaim(hoy);
      return { ...diag, motivo: 'No hay terapeutas activas con citas esta semana ni mañana.' };
    }

    // Responsables activos de todos los pacientes con cita mañana (para el saludo)
    const idsPacManana = citasManana
      .map((c) => c.paciente_id ?? c.paciente?.id)
      .filter((x) => x != null);
    const conResponsable = await this.pacientesConResponsable(idsPacManana);
    const saludo = this.obtenerSaludo();

    // 3. UN solo libro de Excel
    const libro = await this.generarLibroAgenda(
      porTerapeuta, lunes, sabado, manana, conResponsable, saludo,
    );

    // 4. Enviar (los recordatorios YA van dentro del Excel, no en el correo)
    await this.mailService.enviarReporteAgendaSemanal({
      to: this.destinatarios(),
      subject: `Agenda semanal y recordatorios — ${this.formatoFechaLarga(this.fechaLima(0))}`,
      html: this.construirHtml(lunes, sabado, manana, porTerapeuta.size),
      attachments: [
        {
          filename: `Agenda Semanal ${this.formatoDDMM(lunes)} al ${this.formatoDDMM(sabado)}.xlsx`,
          content: libro,
        },
      ],
    });

    this.logger.log(`✅ Reporte enviado. Terapeutas: ${porTerapeuta.size}`);
    return { ...diag, enviado: true };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Agrupación
  // ────────────────────────────────────────────────────────────────────────

  private terapeutasDeCita(c: any): any[] {
    if (c?.doctor) return [c.doctor];
    if (Array.isArray(c?.terapeutas)) {
      return c.terapeutas.map((t: any) => t?.terapeuta).filter(Boolean);
    }
    return [];
  }

  private esActiva(t: any): boolean {
    // Activa = estado true y, si el rol viene cargado, que sea terapeuta
    return t?.estado === true && (!t?.rol || t?.rol?.id === ROL_TERAPEUTA);
  }

  private agruparTerapeutas(
    citasSemana: any[],
    citasManana: any[],
  ): Map<number, GrupoTerapeuta> {
    const mapa = new Map<number, GrupoTerapeuta>();
    const asegurar = (t: any): GrupoTerapeuta => {
      if (!mapa.has(t.id)) mapa.set(t.id, { terapeuta: t, semana: [], manana: [] });
      return mapa.get(t.id);
    };

    for (const cita of citasSemana) {
      for (const t of this.terapeutasDeCita(cita)) {
        if (this.esActiva(t)) asegurar(t).semana.push(cita);
      }
    }
    for (const cita of citasManana) {
      for (const t of this.terapeutasDeCita(cita)) {
        if (this.esActiva(t)) asegurar(t).manana.push(cita);
      }
    }
    return mapa;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Excel: un libro, una hoja por terapeuta
  // ────────────────────────────────────────────────────────────────────────

  private async generarLibroAgenda(
    porTerapeuta: Map<number, GrupoTerapeuta>,
    lunes: string,
    sabado: string,
    manana: string,
    conResponsable: Set<number>,
    saludo: string,
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Centro Crecemos';

    const usados = new Set<string>();
    for (const { terapeuta, semana, manana: citasManana } of porTerapeuta.values()) {
      const nombre = `${terapeuta.nombres} ${terapeuta.apellidos}`.trim();
      const ws = wb.addWorksheet(this.nombreHoja(nombre, usados));
      this.llenarHojaAgenda(ws, nombre, lunes, sabado, semana);
      await this.agregarRecordatorios(ws, citasManana, manana, conResponsable, saludo);
    }
    if (wb.worksheets.length === 0) wb.addWorksheet('Sin datos');

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private llenarHojaAgenda(
    ws: ExcelJS.Worksheet,
    nombreTerapeuta: string,
    lunes: string,
    sabado: string,
    citas: any[],
  ): void {
    const fechasDias = this.fechasDeLaSemana(lunes); // [Lun..Sáb] como YYYY-MM-DD

    ws.columns = [
      { header: 'Hora', key: 'hora', width: 10 },
      ...DIAS.map((d, i) => ({
        header: `${d}\n${this.formatoDDMM(fechasDias[i])}`,
        key: `d${i}`,
        width: 34,
      })),
    ];

    // Título (filas combinadas arriba)
    ws.spliceRows(1, 0, [], []);
    ws.mergeCells(1, 1, 1, 7);
    ws.getCell('A1').value = `Agenda Semanal — ${nombreTerapeuta}`;
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF7B1FA2' } };
    ws.mergeCells(2, 1, 2, 7);
    ws.getCell('A2').value = `Semana del ${this.formatoDDMM(lunes)} al ${this.formatoDDMM(sabado)}`;
    ws.getCell('A2').font = { italic: true, size: 11, color: { argb: 'FF666666' } };

    const headerRow = ws.getRow(3);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B1FA2' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = this.bordeFino();
    });
    headerRow.height = 30;

    const horas = Array.from(new Set(citas.map((c) => this.hhmm(c.hora_inicio)))).sort();
    const idxFecha = new Map<string, number>();
    fechasDias.forEach((f, i) => idxFecha.set(f, i));

    for (const hora of horas) {
      const fila: any = { hora };
      for (const cita of citas.filter((c) => this.hhmm(c.hora_inicio) === hora)) {
        const i = idxFecha.get(String(cita.fecha).slice(0, 10));
        if (i === undefined) continue;
        const texto = this.celdaCita(cita);
        fila[`d${i}`] = fila[`d${i}`] ? `${fila[`d${i}`]}\n──────\n${texto}` : texto;
      }
      const row = ws.addRow(fila);
      row.alignment = { vertical: 'top', wrapText: true };
      row.getCell(1).font = { bold: true };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.eachCell((cell) => (cell.border = this.bordeFino()));
    }

    if (horas.length === 0) {
      ws.addRow({ hora: '—', d0: 'Sin citas esta semana' });
    }
  }

  /** Agrega, debajo de la grilla, los recordatorios de mañana de este terapeuta. */
  private async agregarRecordatorios(
    ws: ExcelJS.Worksheet,
    citasManana: any[],
    manana: string,
    conResponsable: Set<number>,
    saludo: string,
  ): Promise<void> {
    const mensajes = await this.construirMensajes(citasManana, conResponsable, saludo);

    ws.addRow([]); // espacio

    const tituloRow = ws.addRow([`RECORDATORIOS — Citas de mañana (${this.formatoFechaLarga(manana)})`]);
    ws.mergeCells(tituloRow.number, 1, tituloRow.number, 7);
    tituloRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    tituloRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA3C644' } };
    tituloRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    tituloRow.height = 24;

    if (mensajes.length === 0) {
      const r = ws.addRow(['No hay citas agendadas para mañana.']);
      ws.mergeCells(r.number, 1, r.number, 7);
      r.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
      return;
    }

    for (const m of mensajes) {
      // Encabezado del paciente
      const cab = ws.addRow([`${m.paciente} · ${m.telefono}`]);
      ws.mergeCells(cab.number, 1, cab.number, 7);
      cab.getCell(1).font = { bold: true, color: { argb: 'FF7B1FA2' } };

      // Mensaje completo (multilínea) en una celda combinada
      const r = ws.addRow([m.mensaje]);
      ws.mergeCells(r.number, 1, r.number, 7);
      r.getCell(1).alignment = { vertical: 'top', wrapText: true };
      r.height = Math.max(18 * (m.mensaje.split('\n').length + 1), 40);
      ws.addRow([]); // separación
    }
  }

  private celdaCita(c: any): string {
    const paciente = this.nombrePaciente(c.paciente) || 'Paciente';
    const servicio = c.servicio?.nombre || c.motivo?.nombre || 'Cita';
    const estado = c.estado?.nombre ? ` [${c.estado.nombre}]` : '';
    const rango = c.hora_fin
      ? `${this.hhmm(c.hora_inicio)}-${this.hhmm(c.hora_fin)}`
      : this.hhmm(c.hora_inicio);
    return `${rango}\n${paciente}\n${servicio}${estado}`;
  }

  /** Nombre de hoja válido para Excel (máx 31, sin : \ / ? * [ ]) y único. */
  private nombreHoja(nombre: string, usados: Set<string>): string {
    const base = (nombre.replace(/[\\/:*?[\]]/g, ' ').trim().slice(0, 31) || 'Terapeuta');
    let n = base;
    let i = 2;
    while (usados.has(n.toLowerCase())) {
      const sufijo = ` (${i++})`;
      n = base.slice(0, 31 - sufijo.length) + sufijo;
    }
    usados.add(n.toLowerCase());
    return n;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Recordatorios — MISMO mensaje que el modal de agendar cita
  // ────────────────────────────────────────────────────────────────────────

  private async construirMensajes(
    citas: any[],
    conResponsable: Set<number>,
    saludo: string,
  ): Promise<{ paciente: string; telefono: string; mensaje: string; hora: string }[]> {
    // Agrupar por paciente (igual que el modal: todas sus citas de ese día)
    const porPaciente = new Map<number, any[]>();
    for (const c of citas) {
      const pid = c.paciente_id ?? c.paciente?.id;
      if (pid == null) continue;
      if (!porPaciente.has(pid)) porPaciente.set(pid, []);
      porPaciente.get(pid).push(c);
    }

    const out: { paciente: string; telefono: string; mensaje: string; hora: string }[] = [];

    for (const [pid, citasPac] of porPaciente) {
      citasPac.sort((a, b) => this.hhmm(a.hora_inicio).localeCompare(this.hhmm(b.hora_inicio)));
      const cita0 = citasPac[0];
      const nombrePaciente = this.tituloCase(this.nombrePaciente(cita0.paciente) || 'Paciente');
      const { diaSemana, dia, mes } = this.fechaPartes(cita0.fecha);
      const tieneResponsable = conResponsable.has(Number(pid));
      const telefono = cita0.paciente?.celular || cita0.paciente?.celular2 || '—';

      // Aviso de última/penúltima sesión + pago (igual que el modal)
      const addendum = await this.calcularAddendum(citasPac);

      let mensaje: string;
      if (citasPac.length > 1) {
        let mensajeCitas = '';
        citasPac.forEach((cita, index) => {
          mensajeCitas += `\n${index + 1}️⃣ *Cita ${index + 1}*
  🕓 *${this.formatearHora12(cita.hora_inicio)}*
  💜 ${this.getServicioConMotivo(cita)}
  ✨ ${this.getTerapeutaNombre(cita)}`;
          if (index < citasPac.length - 1) mensajeCitas += '\n';
        });

        if (tieneResponsable) {
          mensaje = `${saludo}, Sr(a).
  Le hacemos recordar las citas de *${nombrePaciente}* para el día
  🗓️ *${diaSemana}, ${dia} de ${mes}*
  ${mensajeCitas}${addendum}

  🥳 ¡Los esperamos! ✨`;
        } else {
          mensaje = `${saludo}, *${nombrePaciente}*
  Le hacemos recordar sus citas para el día
  🗓️ *${diaSemana}, ${dia} de ${mes}*
  ${mensajeCitas}${addendum}

  🥳 ¡Lo esperamos! ✨`;
        }
      } else {
        const cita = cita0;
        if (tieneResponsable) {
          mensaje = `${saludo}, Sr(a).
  Le hacemos recordar la cita de *${nombrePaciente}* para el día
  🗓️ *${diaSemana}, ${dia} de ${mes}*
  🕓 *${this.formatearHora12(cita.hora_inicio)}*
  💜 ${this.getServicioConMotivo(cita)}
  ✨ ${this.getTerapeutaNombre(cita)}${addendum}

  🥳 ¡Los esperamos! ✨`;
        } else {
          mensaje = `${saludo}, *${nombrePaciente}*
  Le hacemos recordar su cita para el día
  🗓️ *${diaSemana}, ${dia} de ${mes}*
  🕓 *${this.formatearHora12(cita.hora_inicio)}*
  💜 ${this.getServicioConMotivo(cita)}
  ✨ ${this.getTerapeutaNombre(cita)}${addendum}

  🥳 ¡Lo esperamos! ✨`;
        }
      }

      // Hora de la cita más temprana del paciente (citasPac ya está ordenado por hora)
      const horaMasTemprana = this.hhmm(cita0.hora_inicio);

      out.push({ paciente: nombrePaciente, telefono, mensaje, hora: horaMasTemprana });
    }

    // Ordenar por hora (más temprano arriba); a igual hora, por nombre de paciente
    return out.sort(
      (a, b) => a.hora.localeCompare(b.hora) || a.paciente.localeCompare(b.paciente),
    );
  }

  /**
   * Replica el bloque "mensajeUltimaSesion" del modal de agendar cita:
   * avisos de última/penúltima sesión y aviso de pago de 12 horas.
   * Devuelve '' si no aplica.
   */
  private async calcularAddendum(citasMismoDia: any[]): Promise<string> {
    let mensajeUltimaSesion = '';
    try {
      const citasConVenta = citasMismoDia.filter((c) => c.venta_servicio_detalle_id);
      if (citasConVenta.length === 0) return '';

      const infoVentas = await Promise.all(
        citasConVenta.map((c) =>
          this.citasService.obtenerInfoVentaDeCita(c.id).catch(() => null),
        ),
      );

      const ultimasSesiones: any[] = [];
      const penultimasSesiones: any[] = [];

      infoVentas.forEach((infoVenta, idx) => {
        if (!infoVenta) return;
        const cita = citasConVenta[idx];
        const esSesionUnitaria = infoVenta.tipo_venta_id === 1;
        const restantes = infoVenta.sesiones_restantes || 0;
        const esPenultimaManual =
          !infoVenta.es_penultima_cita && !infoVenta.es_ultima_cita && restantes === 1;

        if (infoVenta.es_ultima_cita) {
          ultimasSesiones.push({ infoVenta, cita, esSesionUnitaria });
        } else if (
          (infoVenta.es_penultima_cita || esPenultimaManual) &&
          infoVenta.sesiones_totales > 2 &&
          restantes > 0
        ) {
          penultimasSesiones.push({ infoVenta, cita, esSesionUnitaria });
        } else if (restantes > 0 && citasMismoDia.length === 1) {
          if (esSesionUnitaria) {
            mensajeUltimaSesion = `\n\n📋 *Recordatorio:* Aún ${restantes === 1 ? 'falta *1 sesión*' : `faltan *${restantes} sesiones*`} por agendar de las ${infoVenta.sesiones_totales} sesiones adquiridas.`;
          } else {
            mensajeUltimaSesion = `\n\n📋 *Recordatorio:* Aún ${restantes === 1 ? 'falta *1 sesión*' : `faltan *${restantes} sesiones*`} por agendar del paquete contratado (${infoVenta.sesiones_totales} sesiones en total).`;
          }
        }
      });

      const hayVariasCitas = citasMismoDia.length > 1;

      if (ultimasSesiones.length > 0) {
        if (ultimasSesiones.length === 1) {
          const { infoVenta, cita, esSesionUnitaria } = ultimasSesiones[0];
          const sujeto = hayVariasCitas ? `la cita de *${this.getServicioConMotivo(cita)}*` : 'esta';
          if (esSesionUnitaria) {
            mensajeUltimaSesion = `\n\n📌 Le comentamos también que ${sujeto} corresponde a la ${infoVenta.sesiones_totales === 1 ? 'sesión adquirida' : `última de las *${infoVenta.sesiones_totales} sesiones* adquiridas`}. En caso deseen continuar con sus terapias, les recomendamos coordinar una nueva contratación con anticipación.\n\n💳 Asimismo, para poder mantener reservado el horario, le agradeceríamos realizar el pago correspondiente dentro de las próximas *12 horas* posteriores a la atención.`;
          } else if (infoVenta.informe_verbal_pendiente) {
            mensajeUltimaSesion = `\n\n📌 Con ${sujeto} se completan las sesiones de *Evaluación* del paquete contratado (${infoVenta.sesiones_totales} sesiones). Recuerden que aún queda pendiente agendar el *Informe Verbal* incluido en el paquete. Les recomendamos coordinarlo pronto.\n\n💳 Asimismo, para poder mantener reservado el horario, le agradeceríamos realizar el pago correspondiente dentro de las próximas *12 horas* posteriores a la atención.`;
          } else {
            mensajeUltimaSesion = `\n\n📌 Le comentamos también que ${sujeto} corresponde a la última sesión del paquete contratado (${infoVenta.sesiones_totales} sesiones). En caso deseen continuar con sus terapias y mantener su horario habitual, les recomendamos coordinar la renovación con anticipación.\n\n💳 Asimismo, para poder mantener reservado el horario, le agradeceríamos realizar el pago correspondiente dentro de las próximas *12 horas* posteriores a la atención.`;
          }
        } else {
          const listaUltimas = ultimasSesiones
            .map(({ infoVenta, cita, esSesionUnitaria }) => {
              const svc = this.getServicioConMotivo(cita);
              if (esSesionUnitaria) {
                return `• La cita de *${svc}* corresponde a la ${infoVenta.sesiones_totales === 1 ? 'sesión adquirida' : `última de las *${infoVenta.sesiones_totales} sesiones* adquiridas`}.`;
              } else if (infoVenta.informe_verbal_pendiente) {
                return `• Con la cita de *${svc}* se completan las sesiones de *Evaluación* del paquete (${infoVenta.sesiones_totales} sesiones). Aún queda pendiente el *Informe Verbal*.`;
              } else {
                return `• La cita de *${svc}* corresponde a la última sesión del paquete contratado (${infoVenta.sesiones_totales} sesiones).`;
              }
            })
            .join('\n');
          mensajeUltimaSesion = `\n\n📌 Le comentamos también que:\n${listaUltimas}\n\nEn caso deseen continuar con sus terapias y mantener su horario habitual, les recomendamos coordinar la renovación con anticipación.\n\n💳 Asimismo, para poder mantener reservado el horario, le agradeceríamos realizar el pago correspondiente dentro de las próximas *12 horas* posteriores a la atención.`;
        }
      } else if (penultimasSesiones.length > 0) {
        if (penultimasSesiones.length === 1) {
          const { infoVenta, cita, esSesionUnitaria } = penultimasSesiones[0];
          const sujeto = hayVariasCitas ? `la cita de *${this.getServicioConMotivo(cita)}*` : 'esta cita';
          if (esSesionUnitaria) {
            mensajeUltimaSesion = `\n\n📌 *Recordatorio:* Luego de ${sujeto}, solo quedará *1 sesión más* de las ${infoVenta.sesiones_totales} sesiones adquiridas. Le recomendamos ir coordinando la contratación de más sesiones para continuar con su proceso.`;
          } else if (infoVenta.informe_verbal_pendiente) {
            mensajeUltimaSesion = `\n\n📌 *Recordatorio:* Luego de ${sujeto}, solo quedará *1 sesión más de Evaluación* por agendar del paquete (${infoVenta.sesiones_totales} sesiones en total), además del *Informe Verbal* incluido en el paquete.`;
          } else {
            mensajeUltimaSesion = `\n\n📌 *Recordatorio:* Luego de ${sujeto}, solo quedará *1 sesión más* por agendar del paquete (${infoVenta.sesiones_totales} sesiones en total).`;
          }
        } else {
          const listaPenultimas = penultimasSesiones
            .map(({ infoVenta, cita, esSesionUnitaria }) => {
              const svc = this.getServicioConMotivo(cita);
              if (esSesionUnitaria) {
                return `• De las ${infoVenta.sesiones_totales} sesiones de *${svc}*, solo quedará *1 sesión más*.`;
              } else if (infoVenta.informe_verbal_pendiente) {
                return `• Del paquete de *${svc}* (${infoVenta.sesiones_totales} sesiones), solo quedará *1 sesión más de Evaluación* y el *Informe Verbal*.`;
              } else {
                return `• Del paquete de *${svc}* (${infoVenta.sesiones_totales} sesiones), solo quedará *1 sesión más* por agendar.`;
              }
            })
            .join('\n');
          mensajeUltimaSesion = `\n\n📌 *Recordatorio:*\n${listaPenultimas}`;
        }
      }
    } catch (err) {
      this.logger.warn(`No se pudo calcular aviso de sesión: ${err?.message || err}`);
    }
    return mensajeUltimaSesion;
  }

  private async pacientesConResponsable(ids: number[]): Promise<Set<number>> {
    if (ids.length === 0) return new Set();
    const rows = await this.responsablePacienteRepo
      .createQueryBuilder('rp')
      .select('DISTINCT rp.paciente_id', 'paciente_id')
      .where('rp.paciente_id IN (:...ids)', { ids })
      .andWhere('rp.activo = :activo', { activo: true })
      .getRawMany();
    return new Set(rows.map((r) => Number(r.paciente_id)));
  }

  // ────────────────────────────────────────────────────────────────────────
  // Candado diario (idempotencia entre instancias)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Intenta reclamar el envío del día `fecha` (YYYY-MM-DD). Devuelve true si esta
   * instancia ganó el candado (debe enviar) o false si otra ya lo tenía.
   */
  private async intentarClaimEnvio(fecha: string): Promise<boolean> {
    try {
      // INSERT IGNORE es atómico y NO lanza excepción ante duplicado: si la fila
      // ya existía, affectedRows = 0. Así no dependemos de detectar el código de
      // error (que TypeORM puede envolver). Solo gana el candado quien inserta.
      const res: any = await this.envioRepo.manager.query(
        'INSERT IGNORE INTO reporte_agenda_envio (fecha) VALUES (?)',
        [fecha],
      );
      const insertadas = res?.affectedRows ?? res?.[0]?.affectedRows ?? 0;
      if (insertadas > 0) return true; // ganamos el candado → enviar
      this.logger.warn(`Reporte ${fecha}: candado ya tomado por otra instancia.`);
      return false; // otra instancia ya lo tiene → no enviar
    } catch (e: any) {
      // Si el candado falla, preferimos NO enviar para evitar el correo doble.
      // (Si la BD estuviera caída, el reporte tampoco se podría generar.)
      this.logger.error(
        `No se pudo aplicar el candado de envío (${fecha}); se omite para evitar duplicados.`,
        e?.stack || e,
      );
      return false;
    }
  }

  /** Libera el candado del día `fecha` para permitir un reintento posterior. */
  private async liberarClaim(fecha: string): Promise<void> {
    try {
      await this.envioRepo.delete({ fecha });
    } catch (e: any) {
      this.logger.warn(`No se pudo liberar el candado de envío (${fecha}): ${e?.message || e}`);
    }
  }

  // Helpers que replican el modal de agendar cita
  private getServicioNombre(c: any): string {
    if (c.tipo_cita === 'NORMAL' && c.servicio) return c.servicio.nombre;
    if (c.tipo_cita === 'VISITA_ESCOLAR') return 'Visita Escolar';
    if (c.tipo_cita === 'REUNION_CLINICA') return 'Reunión Clínica';
    return 'Servicio no especificado';
  }

  private getServicioConMotivo(c: any): string {
    const servicio = this.getServicioNombre(c);
    const motivo = c.motivo?.nombre || '';
    return motivo ? `${servicio} - ${motivo}` : servicio;
  }

  private getTerapeutaNombre(c: any): string {
    if ((c.tipo_cita === 'NORMAL' || c.tipo_cita === 'VISITA_ESCOLAR') && c.doctor) {
      return `Lic. ${c.doctor.nombres || ''} ${c.doctor.apellidos || ''}`.trim();
    }
    if (c.tipo_cita === 'REUNION_CLINICA' && c.terapeutas?.length > 0) {
      return 'Equipo de Terapeutas';
    }
    return 'Terapeuta no especificado';
  }

  private obtenerSaludo(): string {
    const hora = this.getAhoraLima().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  private formatearHora12(horaStr: string): string {
    const [hours, minutes] = String(horaStr).split(':').map(Number);
    const ampm = hours >= 12 ? 'pm' : 'am';
    const h = hours % 12 || 12;
    return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }

  private fechaPartes(fechaStr: string): { diaSemana: string; dia: number; mes: string } {
    const [year, month, day] = String(fechaStr).slice(0, 10).split('-').map(Number);
    const fechaObj = new Date(year, month - 1, day);
    return {
      diaSemana: DIAS_SEMANA[fechaObj.getDay()],
      dia: fechaObj.getDate(),
      mes: MESES[fechaObj.getMonth()],
    };
  }

  private tituloCase(nombre: string): string {
    return nombre
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  // ────────────────────────────────────────────────────────────────────────
  // Correo (HTML) — solo anuncia el adjunto; los recordatorios van en el Excel
  // ────────────────────────────────────────────────────────────────────────

  private construirHtml(lunes: string, sabado: string, manana: string, totalTerapeutas: number): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color:#222;">
        <h2 style="color:#7B1FA2;">Reporte de Agenda</h2>
        <p>Se adjunta <strong>un solo Excel</strong> con la agenda de la semana (del ${this.formatoDDMM(lunes)} al ${this.formatoDDMM(sabado)}),
        con <strong>una hoja por cada terapeuta activa</strong> (${totalTerapeutas} ${totalTerapeutas === 1 ? 'terapeuta' : 'terapeutas'}).</p>
        <p>Dentro de cada hoja, al final, están los <strong>recordatorios de las citas de mañana</strong>
        (${this.formatoFechaLarga(manana)}) de ese terapeuta.</p>

        <hr style="margin:30px 0;border:none;border-top:1px solid #ddd;">
        <p style="font-size:12px;color:#999;">
          <strong>CONTIGO CRECEMOS E.I.R.L.</strong><br>
          Reporte automático generado a las 7:00 PM.
        </p>
      </div>`;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Helpers de fecha (hora de Lima) y formato
  // ────────────────────────────────────────────────────────────────────────

  /** Hora actual en Lima (UTC-5) como Date, para leer getHours(). */
  private getAhoraLima(): Date {
    const ahora = new Date();
    const limaOffset = -5 * 60; // minutos
    const utcMinutes = ahora.getTime() / 60000 + ahora.getTimezoneOffset();
    return new Date((utcMinutes + limaOffset) * 60000);
  }

  /** Devuelve YYYY-MM-DD del día actual en Lima desplazado `offsetDias`. */
  private fechaLima(offsetDias = 0): string {
    // Usar formatToParts para extraer año/mes/día en Lima de forma confiable
    // (parsear toLocaleString es frágil: el formato varía según el entorno).
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = Number(partes.find((p) => p.type === 'year')?.value);
    const m = Number(partes.find((p) => p.type === 'month')?.value);
    const d = Number(partes.find((p) => p.type === 'day')?.value);
    const base = new Date(Date.UTC(y, m - 1, d));
    base.setUTCDate(base.getUTCDate() + offsetDias);
    return base.toISOString().slice(0, 10);
  }

  /** Lunes y sábado (YYYY-MM-DD) de la semana del día actual en Lima. */
  private rangoSemana(): { lunes: string; sabado: string } {
    const hoy = this.fechaLima(0);
    const [y, m, d] = hoy.split('-').map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    const dow = base.getUTCDay(); // 0=Dom .. 6=Sáb
    const diffLunes = dow === 0 ? -6 : 1 - dow;
    const lunes = new Date(base);
    lunes.setUTCDate(base.getUTCDate() + diffLunes);
    const sabado = new Date(lunes);
    sabado.setUTCDate(lunes.getUTCDate() + 5);
    return { lunes: lunes.toISOString().slice(0, 10), sabado: sabado.toISOString().slice(0, 10) };
  }

  private fechasDeLaSemana(lunes: string): string[] {
    const [y, m, d] = lunes.split('-').map(Number);
    return Array.from({ length: 6 }, (_, i) => {
      const f = new Date(Date.UTC(y, m - 1, d));
      f.setUTCDate(f.getUTCDate() + i);
      return f.toISOString().slice(0, 10);
    });
  }

  private hhmm(hora: string): string {
    return hora ? String(hora).slice(0, 5) : '';
  }

  private formatoDDMM(fecha: string): string {
    const [, m, d] = fecha.split('-');
    return `${d}/${m}`;
  }

  private formatoFechaLarga(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    if (!y || !m || !d) return fecha;
    const dt = new Date(Date.UTC(y, m - 1, d));
    const diaSemana = DIAS_SEMANA[dt.getUTCDay()];
    return `${diaSemana}, ${String(d).padStart(2, '0')} de ${MESES[m - 1]} de ${y}`;
  }

  private nombrePaciente(p: any): string {
    if (!p) return '';
    return `${p.nombres || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`
      .replace(/\s+/g, ' ')
      .trim();
  }

  private destinatarios(): string[] {
    const raw = this.configService.get<string>('AGENDA_REPORTE_TO');
    const lista = raw
      ? raw.split(',').map((s) => s.trim()).filter(Boolean)
      : ['rrhh@crecemos.com.pe', 'info@crecemos.com.pe'];

    // Deduplicar (ignorando mayúsculas/espacios) para que un mismo buzón no
    // reciba 2 copias si la config trae la dirección repetida. Conserva el
    // primer formato visto y el orden original.
    const vistos = new Set<string>();
    return lista.filter((email) => {
      const clave = email.toLowerCase();
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  }

  private bordeFino(): Partial<ExcelJS.Borders> {
    const s: ExcelJS.Border = { style: 'thin', color: { argb: 'FFCCCCCC' } };
    return { top: s, left: s, bottom: s, right: s };
  }
}
