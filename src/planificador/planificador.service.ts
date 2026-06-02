import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanificadorBloque } from './entities/planificador-bloque.entity';
import { PlanificadorObjetivo } from './entities/planificador-objetivo.entity';
import { PlanificadorSesion } from './entities/planificador-sesion.entity';

const TAM_BLOQUE = 4; // 4 sesiones = 100%
const MOTIVO_TERAPIA = 4; // motivo_cita de "sesión de terapia"
// Estados de cita que NO cuentan como sesión válida (canceladas, no-asistió/reprog.)
const ESTADOS_NO_VALIDOS = [5, 8];

@Injectable()
export class PlanificadorService {
  constructor(
    @InjectRepository(PlanificadorBloque)
    private bloqueRepo: Repository<PlanificadorBloque>,
    @InjectRepository(PlanificadorObjetivo)
    private objetivoRepo: Repository<PlanificadorObjetivo>,
    @InjectRepository(PlanificadorSesion)
    private sesionRepo: Repository<PlanificadorSesion>,
  ) {}

  // ────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────

  private esAdmin(user: any): boolean {
    return user?.rol?.nombre === 'Administrador' || user?.rol?.id === 1;
  }

  /** Citas de terapia del servicio (todas las ventas) ordenadas en el tiempo = sesiones 1..N. */
  private async getCitasDeServicio(pacienteId: number, servicioId: number): Promise<any[]> {
    return this.bloqueRepo.query(
      `
      SELECT c.id, c.fecha, c.hora_inicio, c.hora_fin, c.duracion_minutos,
             c.estado_id, c.doctor_id,
             ec.nombre AS estado_nombre,
             CONCAT(tc.nombres, ' ', tc.apellidos) AS terapeuta_nombre,
             c.venta_servicio_detalle_id,
             vsd.descripcion_linea AS venta_descripcion,
             vsd.sesiones_totales  AS venta_sesiones_totales,
             vsd.sesiones_usadas   AS venta_sesiones_usadas,
             vs.id                 AS venta_id,
             vs.codigo_comprobante AS venta_codigo,
             vs.fecha_venta        AS venta_fecha,
             tcomp.nombre          AS venta_comprobante
      FROM citas c
      LEFT JOIN estado_cita ec ON ec.id = c.estado_id
      LEFT JOIN trabajador_centro tc ON tc.id = c.doctor_id
      LEFT JOIN venta_servicio_detalle vsd ON vsd.id = c.venta_servicio_detalle_id
      LEFT JOIN venta_servicio vs ON vs.id = vsd.venta_id
      LEFT JOIN tipo_comprobante tcomp ON tcomp.id = vs.tipo_comprobante_id
      WHERE c.paciente_id = ? AND c.servicio_id = ? AND c.motivo_id = ? AND c.flg_activo = 1
      ORDER BY c.fecha, c.hora_inicio, c.id
      `,
      [pacienteId, servicioId, MOTIVO_TERAPIA],
    );
  }

  private async getTerapeuta(pacienteId: number, servicioId: number): Promise<{ id: number; nombre: string } | null> {
    const citas = await this.getCitasDeServicio(pacienteId, servicioId);
    const conDoctor = [...citas].reverse().find((c) => c.doctor_id); // el más reciente
    if (!conDoctor) return null;
    return { id: conDoctor.doctor_id, nombre: conDoctor.terapeuta_nombre };
  }

  /** Acceso: admin, o terapeuta que es doctor de alguna cita de ese servicio del paciente. */
  private async assertAcceso(user: any, pacienteId: number, servicioId: number): Promise<void> {
    if (this.esAdmin(user)) return;
    const rows = await this.bloqueRepo.query(
      `SELECT 1 FROM citas
       WHERE paciente_id = ? AND servicio_id = ? AND motivo_id = ? AND doctor_id = ? AND flg_activo = 1
       LIMIT 1`,
      [pacienteId, servicioId, MOTIVO_TERAPIA, user?.id],
    );
    if (rows.length) return;
    throw new ForbiddenException('No tienes acceso al plan terapéutico de este servicio');
  }

  private hoyISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private citaRealizada(cita: any): boolean {
    if (!cita) return false;
    if (ESTADOS_NO_VALIDOS.includes(Number(cita.estado_id))) return false;
    return String(cita.fecha).slice(0, 10) <= this.hoyISO();
  }

  /** Se puede registrar resultado: basta una cita agendada no cancelada. */
  private puedeRegistrar(cita: any): boolean {
    if (!cita) return false;
    return !ESTADOS_NO_VALIDOS.includes(Number(cita.estado_id));
  }

  // ────────────────────────────────────────────────────────────────
  // Lectura
  // ────────────────────────────────────────────────────────────────

  /** Servicios (de terapia) del paciente que el usuario puede planificar. */
  async listarServicios(pacienteId: number, user: any): Promise<any[]> {
    const servicios = await this.bloqueRepo.query(
      `
      SELECT c.servicio_id, s.nombre AS servicio_nombre, COUNT(*) AS total_sesiones,
             (SELECT cx.doctor_id FROM citas cx
                WHERE cx.paciente_id = c.paciente_id AND cx.servicio_id = c.servicio_id
                  AND cx.motivo_id = ? AND cx.flg_activo = 1
                ORDER BY cx.fecha DESC, cx.id DESC LIMIT 1) AS terapeuta_id,
             (SELECT CONCAT(tc.nombres, ' ', tc.apellidos) FROM citas cx
                INNER JOIN trabajador_centro tc ON tc.id = cx.doctor_id
                WHERE cx.paciente_id = c.paciente_id AND cx.servicio_id = c.servicio_id
                  AND cx.motivo_id = ? AND cx.flg_activo = 1
                ORDER BY cx.fecha DESC, cx.id DESC LIMIT 1) AS terapeuta_nombre
      FROM citas c
      INNER JOIN servicios s ON s.id = c.servicio_id
      WHERE c.paciente_id = ? AND c.motivo_id = ? AND c.flg_activo = 1
      GROUP BY c.servicio_id, s.nombre
      ORDER BY s.nombre
      `,
      [MOTIVO_TERAPIA, MOTIVO_TERAPIA, pacienteId, MOTIVO_TERAPIA],
    );

    if (this.esAdmin(user)) return servicios;

    const mios = await this.bloqueRepo.query(
      `SELECT DISTINCT servicio_id FROM citas
       WHERE paciente_id = ? AND doctor_id = ? AND motivo_id = ? AND flg_activo = 1`,
      [pacienteId, user?.id, MOTIVO_TERAPIA],
    );
    const set = new Set(mios.map((m) => Number(m.servicio_id)));
    return servicios.filter((s) => set.has(Number(s.servicio_id)));
  }

  /** Plan de un servicio: línea de tiempo de sesiones + bloques con objetivos y registros. */
  async obtenerPlan(pacienteId: number, servicioId: number, user: any): Promise<any> {
    await this.assertAcceso(user, pacienteId, servicioId);

    const citas = await this.getCitasDeServicio(pacienteId, servicioId);
    const terapeuta = await this.getTerapeuta(pacienteId, servicioId);
    const n = citas.length;

    // Sesiones COMPRADAS para este servicio (suma de todas las ventas con cita).
    const compraRows = await this.bloqueRepo.query(
      `SELECT COALESCE(SUM(vsd.sesiones_totales), 0) AS comprado
       FROM venta_servicio_detalle vsd
       INNER JOIN servicio_tarifa st ON st.id = vsd.servicio_tarifa_id
       WHERE vsd.paciente_id = ? AND st.servicio_id = ? AND vsd.tipo_item_venta = 1`,
      [pacienteId, servicioId],
    );
    const comprado = Number(compraRows[0]?.comprado || 0);

    // Nº de bloques: cubre lo comprado y las citas, + un bloque para seguir planificando.
    const base = Math.max(comprado, n);
    const numBloques = Math.max(1, Math.ceil((base + 1) / TAM_BLOQUE));
    await this.asegurarBloques(pacienteId, servicioId, terapeuta, user, numBloques);

    // Slots de sesión: 1..(numBloques*4). Estado según cita / compra.
    const totalSlots = numBloques * TAM_BLOQUE;
    const sesiones = [];
    for (let i = 1; i <= totalSlots; i++) {
      const cita = citas[i - 1] || null;
      let estado: string;
      if (cita) estado = this.citaRealizada(cita) ? 'REALIZADA' : 'AGENDADA';
      else if (i <= comprado) estado = 'POR_AGENDAR'; // pagado, falta agendar
      else estado = 'FALTA_PAGAR'; // ni pagado ni agendado
      sesiones.push({
        numero_sesion: i,
        cita_id: cita?.id ?? null,
        fecha: cita?.fecha ?? null,
        hora_inicio: cita?.hora_inicio ?? null,
        duracion_minutos: cita?.duracion_minutos ?? null,
        terapeuta_nombre: cita?.terapeuta_nombre ?? null,
        estado_id: cita?.estado_id ?? null,
        estado_nombre: cita?.estado_nombre ?? null,
        estado,
        puede_registrar: this.puedeRegistrar(cita),
        venta: cita?.venta_id
          ? {
              venta_id: cita.venta_id,
              detalle_id: cita.venta_servicio_detalle_id,
              codigo: cita.venta_codigo,
              comprobante: cita.venta_comprobante,
              fecha: cita.venta_fecha,
              descripcion: cita.venta_descripcion,
              sesiones_totales: cita.venta_sesiones_totales,
              sesiones_usadas: cita.venta_sesiones_usadas,
            }
          : null,
      });
    }

    const bloques = await this.bloqueRepo.query(
      `SELECT * FROM planificador_bloque
       WHERE paciente_id = ? AND servicio_id = ? AND flg_activo = 1
       ORDER BY numero_bloque`,
      [pacienteId, servicioId],
    );

    if (bloques.length) {
      const ids = bloques.map((b) => b.id);
      const objetivos = await this.objetivoRepo.query(
        `SELECT * FROM planificador_objetivo
         WHERE bloque_id IN (${ids.map(() => '?').join(',')}) AND flg_activo = 1
         ORDER BY orden, id`,
        ids,
      );
      const registros = await this.sesionRepo.query(
        `SELECT * FROM planificador_sesion
         WHERE bloque_id IN (${ids.map(() => '?').join(',')}) AND flg_activo = 1`,
        ids,
      );
      for (const bloque of bloques) {
        bloque.objetivos = objetivos
          .filter((o) => o.bloque_id === bloque.id)
          .map((o) => {
            const regs = registros.filter((r) => r.objetivo_id === o.id);
            const progreso = regs.reduce((acc, r) => acc + Number(r.puntaje || 0), 0);
            return {
              ...o,
              progreso: Math.min(100, progreso),
              registros: regs.reduce((map, r) => {
                map[r.numero_sesion] = {
                  id: r.id, numero_sesion: r.numero_sesion, resultado: r.resultado,
                  puntaje: Number(r.puntaje || 0), observaciones: r.observaciones, cita_id: r.cita_id,
                };
                return map;
              }, {} as Record<number, any>),
            };
          });
      }
    }

    return {
      servicio: { id: servicioId, paciente_id: pacienteId, total_sesiones: n, sesiones_compradas: comprado },
      terapeuta,
      sesiones,
      bloques,
    };
  }

  private async asegurarBloques(
    pacienteId: number,
    servicioId: number,
    terapeuta: { id: number; nombre: string } | null,
    user: any,
    numBloques: number,
  ): Promise<void> {
    const existentes = await this.bloqueRepo.query(
      `SELECT numero_bloque FROM planificador_bloque
       WHERE paciente_id = ? AND servicio_id = ? AND flg_activo = 1`,
      [pacienteId, servicioId],
    );
    const yaExiste = new Set(existentes.map((e) => Number(e.numero_bloque)));
    for (let n = 1; n <= numBloques; n++) {
      if (yaExiste.has(n)) continue;
      const desde = (n - 1) * TAM_BLOQUE + 1;
      await this.bloqueRepo.save(
        this.bloqueRepo.create({
          paciente_id: pacienteId,
          servicio_id: servicioId,
          terapeuta_id: terapeuta?.id ?? null,
          numero_bloque: n,
          sesion_desde: desde,
          sesion_hasta: desde + TAM_BLOQUE - 1,
          estado: 'ABIERTO',
          user_id_crea: user?.id ?? null,
        }),
      );
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Objetivos
  // ────────────────────────────────────────────────────────────────

  private async getBloqueOrFail(bloqueId: number): Promise<PlanificadorBloque> {
    const bloque = await this.bloqueRepo.findOne({ where: { id: bloqueId, flg_activo: 1 } });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');
    return bloque;
  }

  async agregarObjetivo(body: any, user: any): Promise<any> {
    const bloque = await this.getBloqueOrFail(body.bloque_id);
    await this.assertAcceso(user, bloque.paciente_id, bloque.servicio_id);

    const max = await this.objetivoRepo.query(
      `SELECT COALESCE(MAX(orden), -1) AS m FROM planificador_objetivo WHERE bloque_id = ?`,
      [bloque.id],
    );
    const objetivo = this.objetivoRepo.create({
      bloque_id: bloque.id,
      titulo: body.titulo,
      objetivo_especifico: body.objetivo_especifico ?? null,
      actividad_ejemplo: body.actividad_ejemplo ?? null,
      materiales: body.materiales ?? null,
      orden: Number(max[0]?.m ?? -1) + 1,
      continuado_de_objetivo_id: body.continuado_de_objetivo_id ?? null,
      user_id_crea: user?.id ?? null,
    });
    return this.objetivoRepo.save(objetivo);
  }

  async editarObjetivo(id: number, body: any, user: any): Promise<any> {
    const objetivo = await this.objetivoRepo.findOne({ where: { id, flg_activo: 1 } });
    if (!objetivo) throw new NotFoundException('Objetivo no encontrado');
    const bloque = await this.getBloqueOrFail(objetivo.bloque_id);
    await this.assertAcceso(user, bloque.paciente_id, bloque.servicio_id);
    for (const campo of ['titulo', 'objetivo_especifico', 'actividad_ejemplo', 'materiales']) {
      if (body[campo] !== undefined) objetivo[campo] = body[campo];
    }
    objetivo.user_id_actua = user?.id ?? null;
    return this.objetivoRepo.save(objetivo);
  }

  async eliminarObjetivo(id: number, user: any): Promise<any> {
    const objetivo = await this.objetivoRepo.findOne({ where: { id, flg_activo: 1 } });
    if (!objetivo) throw new NotFoundException('Objetivo no encontrado');
    const bloque = await this.getBloqueOrFail(objetivo.bloque_id);
    await this.assertAcceso(user, bloque.paciente_id, bloque.servicio_id);
    objetivo.flg_activo = 0;
    objetivo.user_id_actua = user?.id ?? null;
    await this.objetivoRepo.save(objetivo);
    return { ok: true };
  }

  // ────────────────────────────────────────────────────────────────
  // Registro de resultado por sesión
  // ────────────────────────────────────────────────────────────────

  async guardarRegistro(body: any, user: any): Promise<any> {
    const objetivo = await this.objetivoRepo.findOne({ where: { id: body.objetivo_id, flg_activo: 1 } });
    if (!objetivo) throw new NotFoundException('Objetivo no encontrado');
    const bloque = await this.getBloqueOrFail(objetivo.bloque_id);
    await this.assertAcceso(user, bloque.paciente_id, bloque.servicio_id);

    const numeroSesion = Number(body.numero_sesion);
    if (numeroSesion < bloque.sesion_desde || numeroSesion > bloque.sesion_hasta) {
      throw new BadRequestException('La sesión no pertenece a este bloque');
    }

    const citas = await this.getCitasDeServicio(bloque.paciente_id, bloque.servicio_id);
    const cita = citas[numeroSesion - 1] || null;
    if (!this.puedeRegistrar(cita)) {
      throw new BadRequestException('Esta sesión no tiene una cita agendada para registrar el resultado');
    }

    const resultado = body.resultado;
    if (!['NO_LOGRADO', 'EN_PROCESO', 'LOGRADO'].includes(resultado)) {
      throw new BadRequestException('Resultado inválido');
    }

    let registro = await this.sesionRepo.findOne({
      where: { objetivo_id: objetivo.id, numero_sesion: numeroSesion, flg_activo: 1 },
    });
    if (registro) {
      registro.resultado = resultado;
      registro.observaciones = body.observaciones ?? null;
      registro.cita_id = cita.id;
      registro.fecha_registro = new Date();
      registro.registrado_por = user?.id ?? null;
    } else {
      registro = this.sesionRepo.create({
        objetivo_id: objetivo.id,
        bloque_id: bloque.id,
        numero_sesion: numeroSesion,
        cita_id: cita.id,
        resultado,
        observaciones: body.observaciones ?? null,
        fecha_registro: new Date(),
        registrado_por: user?.id ?? null,
      });
    }
    await this.sesionRepo.save(registro);
    return this.sesionRepo.findOne({ where: { id: registro.id } });
  }
}
