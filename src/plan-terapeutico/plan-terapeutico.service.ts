import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanTerapeutico } from './entities/plan-terapeutico.entity';
import { PlanObjetivoGeneral } from './entities/plan-objetivo-general.entity';
import { PlanObjetivoEspecifico } from './entities/plan-objetivo-especifico.entity';
import { PlanRegistroSesion } from './entities/plan-registro-sesion.entity';
import { PlanBloqueObjetivo } from './entities/plan-bloque-objetivo.entity';
import { PlanArea } from './entities/plan-area.entity';
import { PlanFrecuencia } from './entities/plan-frecuencia.entity';
import { PlanResultado } from './entities/plan-resultado.entity';
import { PlanEstado } from './entities/plan-estado.entity';
import { SERVICIOS } from '../constants/servicios.constants';

const MOTIVO_TERAPIA = 4; // motivo_cita de "sesión de terapia"
const ESTADOS_NO_VALIDOS = [5, 8]; // citas canceladas / no-asistió-reprog.
const MAX_GENERALES = 3;
const MAX_ESPECIFICOS = 3;
const SESIONES_POR_BLOQUE = 4; // un bloque agrupa 4 sesiones
// Servicios de Terapia de Lenguaje (infantil y adultos): aquí la subordinada solo
// registra progreso y observaciones; objetivos/actividades/materiales los maneja la jefa o admin.
const SERVICIOS_LENGUAJE: number[] = [SERVICIOS.TERAPIA_LENGUAJE_INFANTIL, SERVICIOS.TERAPIA_LENGUAJE_ADULTOS];

/** Bloque (1..N) al que pertenece una sesión. */
const bloqueDeSesion = (numeroSesion: number): number =>
  Math.floor((Number(numeroSesion) - 1) / SESIONES_POR_BLOQUE) + 1;

@Injectable()
export class PlanTerapeuticoService {
  constructor(
    @InjectRepository(PlanTerapeutico)
    private planRepo: Repository<PlanTerapeutico>,
    @InjectRepository(PlanObjetivoGeneral)
    private generalRepo: Repository<PlanObjetivoGeneral>,
    @InjectRepository(PlanObjetivoEspecifico)
    private especificoRepo: Repository<PlanObjetivoEspecifico>,
    @InjectRepository(PlanRegistroSesion)
    private registroRepo: Repository<PlanRegistroSesion>,
    @InjectRepository(PlanBloqueObjetivo)
    private bloqueObjetivoRepo: Repository<PlanBloqueObjetivo>,
    @InjectRepository(PlanArea)
    private areaRepo: Repository<PlanArea>,
    @InjectRepository(PlanFrecuencia)
    private frecuenciaRepo: Repository<PlanFrecuencia>,
    @InjectRepository(PlanResultado)
    private resultadoRepo: Repository<PlanResultado>,
    @InjectRepository(PlanEstado)
    private estadoRepo: Repository<PlanEstado>,
  ) {}

  // ────────────────────────────────────────────────────────────────
  // Helpers (reutilizan la línea de tiempo de citas, igual que planificador)
  // ────────────────────────────────────────────────────────────────

  /** Terapeuta (rol 4): solo accede a sus propios pacientes. */
  private esTerapeuta(user: any): boolean {
    const rol = user?.rol;
    const id = Number(rol?.id ?? user?.rol_id);
    const nombre = (typeof rol === 'string' ? rol : rol?.nombre)?.toString().trim().toLowerCase();
    return id === 4 || nombre === 'terapeuta';
  }

  /**
   * Acceso total. La ruta ya está restringida por @Roles a Administrador/Terapeuta,
   * así que todo el que NO es terapeuta es administrativo y puede ver/armar todo.
   */
  private esAdmin(user: any): boolean {
    return !this.esTerapeuta(user);
  }

  /** ¿El trabajador ocupa un cargo jefatura (cargo.es_jefe)? */
  private async esJefe(userId: number): Promise<boolean> {
    if (!userId) return false;
    const rows = await this.planRepo.query(
      `SELECT c.es_jefe FROM trabajador_centro t
       INNER JOIN cargos c ON c.id = t.cargo_id
       WHERE t.id = ? LIMIT 1`,
      [userId],
    );
    return !!rows[0]?.es_jefe;
  }

  /**
   * ¿Puede gestionar objetivos/actividades/materiales del plan?
   * Admin siempre; en servicios que NO son Terapia de Lenguaje, cualquier terapeuta asignado;
   * en Terapia de Lenguaje, solo la jefa (cargo.es_jefe).
   */
  private async puedeGestionarObjetivos(user: any, servicioId: number): Promise<boolean> {
    if (this.esAdmin(user)) return true;
    if (!SERVICIOS_LENGUAJE.includes(Number(servicioId))) return true;
    return this.esJefe(user?.id);
  }

  /** Igual que puedeGestionarObjetivos pero lanza 403 si no tiene permiso. */
  private async assertPuedeGestionar(user: any, servicioId: number): Promise<void> {
    if (await this.puedeGestionarObjetivos(user, servicioId)) return;
    throw new ForbiddenException(
      'En Terapia de Lenguaje solo la jefa puede gestionar objetivos, actividades y materiales',
    );
  }

  private hoyISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Normaliza una fecha (Date de mysql2 o string) a 'YYYY-MM-DD'. */
  private fechaISO(value: any): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    return String(value).slice(0, 10);
  }

  private citaRealizada(cita: any): boolean {
    if (!cita) return false;
    if (ESTADOS_NO_VALIDOS.includes(Number(cita.estado_id))) return false;
    return this.fechaISO(cita.fecha) <= this.hoyISO();
  }

  private puedeRegistrar(cita: any): boolean {
    if (!cita) return false;
    return !ESTADOS_NO_VALIDOS.includes(Number(cita.estado_id));
  }

  private async getCitasDeServicio(pacienteId: number, servicioId: number): Promise<any[]> {
    return this.planRepo.query(
      `
      SELECT c.id, c.fecha, c.hora_inicio, c.hora_fin, c.duracion_minutos,
             c.estado_id, c.doctor_id,
             ec.nombre AS estado_nombre,
             CONCAT(tc.nombres, ' ', tc.apellidos) AS terapeuta_nombre,
             c.venta_servicio_detalle_id,
             vs.id                 AS venta_id,
             vs.codigo_comprobante AS venta_codigo,
             vs.fecha_venta        AS venta_fecha
      FROM citas c
      LEFT JOIN estado_cita ec ON ec.id = c.estado_id
      LEFT JOIN trabajador_centro tc ON tc.id = c.doctor_id
      LEFT JOIN venta_servicio_detalle vsd ON vsd.id = c.venta_servicio_detalle_id
      LEFT JOIN venta_servicio vs ON vs.id = vsd.venta_id
      WHERE c.paciente_id = ? AND c.servicio_id = ? AND c.motivo_id = ? AND c.flg_activo = 1
      ORDER BY c.fecha, c.hora_inicio, c.id
      `,
      [pacienteId, servicioId, MOTIVO_TERAPIA],
    );
  }

  /** Terapeuta asignado al servicio del paciente (no depende de citas). */
  private async getTerapeuta(pacienteId: number, servicioId: number): Promise<{ id: number; nombre: string } | null> {
    const rows = await this.planRepo.query(
      `SELECT at.terapeuta_id AS id, CONCAT(tc.nombres, ' ', tc.apellidos) AS nombre
       FROM paciente_servicio ps
       INNER JOIN asignacion_terapeuta at ON at.paciente_servicio_id = ps.id
         AND at.activo = 1 AND (at.estado IS NULL OR at.estado = 'ACTIVO')
       INNER JOIN trabajador_centro tc ON tc.id = at.terapeuta_id
       WHERE ps.paciente_id = ? AND ps.servicio_id = ? AND ps.activo = 1
       ORDER BY at.id DESC LIMIT 1`,
      [pacienteId, servicioId],
    );
    return rows[0] || null;
  }

  /** Acceso: admin, o terapeuta asignado a ese servicio del paciente. */
  private async assertAcceso(user: any, pacienteId: number, servicioId: number): Promise<void> {
    if (this.esAdmin(user)) return;
    const rows = await this.planRepo.query(
      `SELECT 1 FROM paciente_servicio ps
       INNER JOIN asignacion_terapeuta at ON at.paciente_servicio_id = ps.id
       WHERE ps.paciente_id = ? AND ps.servicio_id = ? AND ps.activo = 1
         AND at.terapeuta_id = ? AND at.activo = 1 AND (at.estado IS NULL OR at.estado = 'ACTIVO')
       LIMIT 1`,
      [pacienteId, servicioId, user?.id],
    );
    if (rows.length) return;
    throw new ForbiddenException('No tienes acceso al plan terapéutico de este servicio');
  }

  // ────────────────────────────────────────────────────────────────
  // Catálogos
  // ────────────────────────────────────────────────────────────────

  /** Áreas de trabajo disponibles para un servicio. */
  async listarAreas(servicioId: number): Promise<PlanArea[]> {
    return this.areaRepo.find({
      where: { servicio_id: servicioId, flg_activo: 1 },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  /** Servicios ASIGNADOS al paciente que el usuario puede planificar (no requiere citas). */
  async listarServicios(pacienteId: number, user: any): Promise<any[]> {
    const rows = await this.planRepo.query(
      `
      SELECT ps.servicio_id, s.nombre AS servicio_nombre,
             (SELECT COUNT(*) FROM citas c
                WHERE c.paciente_id = ps.paciente_id AND c.servicio_id = ps.servicio_id
                  AND c.motivo_id = ? AND c.flg_activo = 1) AS total_sesiones,
             at.terapeuta_id,
             CONCAT(tc.nombres, ' ', tc.apellidos) AS terapeuta_nombre
      FROM paciente_servicio ps
      INNER JOIN servicios s ON s.id = ps.servicio_id
      LEFT JOIN asignacion_terapeuta at ON at.paciente_servicio_id = ps.id
        AND at.activo = 1 AND (at.estado IS NULL OR at.estado = 'ACTIVO')
      LEFT JOIN trabajador_centro tc ON tc.id = at.terapeuta_id
      WHERE ps.paciente_id = ? AND ps.activo = 1 AND (ps.estado IS NULL OR ps.estado = 'ACTIVO')
      ORDER BY s.nombre, at.id DESC
      `,
      [MOTIVO_TERAPIA, pacienteId],
    );

    // Dedupe por servicio (deja la asignación de terapeuta más reciente).
    const vistos = new Set<number>();
    let servicios = [];
    for (const r of rows) {
      if (vistos.has(Number(r.servicio_id))) continue;
      vistos.add(Number(r.servicio_id));
      servicios.push({ ...r, total_sesiones: Number(r.total_sesiones || 0) });
    }

    if (this.esAdmin(user)) return servicios;

    // Terapeuta: solo servicios donde está asignado.
    const mios = await this.planRepo.query(
      `SELECT DISTINCT ps.servicio_id
       FROM paciente_servicio ps
       INNER JOIN asignacion_terapeuta at ON at.paciente_servicio_id = ps.id
       WHERE ps.paciente_id = ? AND ps.activo = 1 AND at.terapeuta_id = ?
         AND at.activo = 1 AND (at.estado IS NULL OR at.estado = 'ACTIVO')`,
      [pacienteId, user?.id],
    );
    const set = new Set(mios.map((m) => Number(m.servicio_id)));
    return servicios.filter((s) => set.has(Number(s.servicio_id)));
  }

  // ────────────────────────────────────────────────────────────────
  // Plan
  // ────────────────────────────────────────────────────────────────

  private async getEstadoActivoId(): Promise<number> {
    const e = await this.estadoRepo.findOne({ where: { codigo: 'ACTIVO' } });
    if (!e) throw new BadRequestException('Falta seed de plan_estado (ACTIVO)');
    return e.id;
  }

  /** Devuelve la cabecera del plan; la crea si no existe. */
  private async asegurarPlan(
    pacienteId: number,
    servicioId: number,
    terapeuta: { id: number; nombre: string } | null,
    user: any,
  ): Promise<PlanTerapeutico> {
    let plan = await this.planRepo.findOne({
      where: { paciente_id: pacienteId, servicio_id: servicioId, flg_activo: 1 },
    });
    if (plan) return plan;
    plan = this.planRepo.create({
      paciente_id: pacienteId,
      servicio_id: servicioId,
      terapeuta_id: terapeuta?.id ?? null,
      estado_id: await this.getEstadoActivoId(),
      user_id_crea: user?.id ?? null,
    });
    return this.planRepo.save(plan);
  }

  /** Plan completo: sesiones (de citas) + generales → específicos → registros + progresos. */
  async obtenerPlan(pacienteId: number, servicioId: number, user: any): Promise<any> {
    await this.assertAcceso(user, pacienteId, servicioId);

    const citas = await this.getCitasDeServicio(pacienteId, servicioId);
    const terapeuta = await this.getTerapeuta(pacienteId, servicioId);
    const n = citas.length;
    const plan = await this.asegurarPlan(pacienteId, servicioId, terapeuta, user);

    // Sesiones compradas (todas las ventas del servicio).
    const compraRows = await this.planRepo.query(
      `SELECT COALESCE(SUM(vsd.sesiones_totales), 0) AS comprado
       FROM venta_servicio_detalle vsd
       INNER JOIN servicio_tarifa st ON st.id = vsd.servicio_tarifa_id
       WHERE vsd.paciente_id = ? AND st.servicio_id = ? AND vsd.tipo_item_venta = 1`,
      [pacienteId, servicioId],
    );
    const comprado = Number(compraRows[0]?.comprado || 0);

    const totalSlots = Math.max(comprado, n);
    const sesiones = [];
    for (let i = 1; i <= totalSlots; i++) {
      const cita = citas[i - 1] || null;
      let estado: string;
      if (cita) estado = this.citaRealizada(cita) ? 'REALIZADA' : 'AGENDADA';
      else if (i <= comprado) estado = 'POR_AGENDAR';
      else estado = 'FALTA_PAGAR';
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
          ? { venta_id: cita.venta_id, codigo: cita.venta_codigo, fecha: cita.venta_fecha }
          : null,
      });
    }

    const generales = await this.armarGenerales(plan.id);

    const [frecuencias, resultados] = await Promise.all([
      this.frecuenciaRepo.find({ where: { flg_activo: 1 }, order: { orden: 'ASC' } }),
      this.resultadoRepo.find({ where: { flg_activo: 1 }, order: { orden: 'ASC' } }),
    ]);

    const progresoPlan = generales.length
      ? Math.round(generales.reduce((a, g) => a + g.progreso, 0) / generales.length)
      : 0;

    const gestionarObjetivos = await this.puedeGestionarObjetivos(user, servicioId);

    return {
      plan: {
        id: plan.id,
        paciente_id: pacienteId,
        servicio_id: servicioId,
        metodologia: plan.metodologia,
        fecha_inicio: plan.fecha_inicio,
        revision_cada: plan.revision_cada,
        reunion_padres_cada: plan.reunion_padres_cada,
        progreso: progresoPlan,
      },
      terapeuta,
      servicio: { id: servicioId, total_sesiones: n, sesiones_compradas: comprado },
      sesiones,
      generales,
      catalogos: { frecuencias, resultados },
      limites: { max_generales: MAX_GENERALES, max_especificos: MAX_ESPECIFICOS },
      permisos: { gestionar_objetivos: gestionarObjetivos },
    };
  }

  /** Carga generales con sus específicos, registros y progresos calculados. */
  private async armarGenerales(planId: number): Promise<any[]> {
    const generales = await this.planRepo.query(
      `SELECT g.*, a.nombre AS area_nombre, f.nombre AS frecuencia_nombre
       FROM plan_objetivo_general g
       INNER JOIN plan_area a ON a.id = g.area_id
       LEFT JOIN plan_frecuencia f ON f.id = g.frecuencia_id
       WHERE g.plan_id = ? AND g.flg_activo = 1
       ORDER BY g.orden, g.id`,
      [planId],
    );
    if (!generales.length) return [];

    const genIds = generales.map((g) => g.id);
    const especificos = await this.planRepo.query(
      `SELECT * FROM plan_objetivo_especifico
       WHERE objetivo_general_id IN (${genIds.map(() => '?').join(',')}) AND flg_activo = 1
       ORDER BY orden, id`,
      genIds,
    );

    const espIds = especificos.map((e) => e.id);
    const registros = espIds.length
      ? await this.planRepo.query(
          `SELECT r.*, res.codigo AS resultado_codigo, res.valor AS resultado_valor,
                  res.color AS resultado_color, res.nombre AS resultado_nombre
           FROM plan_registro_sesion r
           LEFT JOIN plan_resultado res ON res.id = r.resultado_id
           WHERE r.objetivo_especifico_id IN (${espIds.map(() => '?').join(',')}) AND r.flg_activo = 1`,
          espIds,
        )
      : [];

    const asignaciones = espIds.length
      ? await this.planRepo.query(
          `SELECT objetivo_especifico_id, numero_sesion
           FROM plan_bloque_objetivo
           WHERE objetivo_especifico_id IN (${espIds.map(() => '?').join(',')}) AND flg_activo = 1`,
          espIds,
        )
      : [];

    const especificosConProg = especificos.map((e) => {
      const regs = registros.filter((r) => r.objetivo_especifico_id === e.id);
      // El progreso solo promedia registros que tienen un resultado marcado.
      const evaluados = regs.filter((r) => r.resultado_valor != null);
      const progreso = evaluados.length
        ? Math.round((evaluados.reduce((a, r) => a + Number(r.resultado_valor || 0), 0) / (evaluados.length * 2)) * 100)
        : 0;
      // Sesiones asignadas = asignaciones explícitas ∪ sesiones que ya tienen registro.
      const sesionesAsig = asignaciones
        .filter((a) => a.objetivo_especifico_id === e.id)
        .map((a) => Number(a.numero_sesion));
      const sesionesReg = regs.map((r) => Number(r.numero_sesion));
      const sesiones_asignadas = Array.from(new Set([...sesionesAsig, ...sesionesReg])).sort((a, b) => a - b);
      return {
        ...e,
        progreso,
        sesiones_asignadas,
        registros: regs.reduce((map, r) => {
          map[r.numero_sesion] = {
            id: r.id,
            numero_sesion: r.numero_sesion,
            resultado_id: r.resultado_id,
            resultado_codigo: r.resultado_codigo,
            resultado_color: r.resultado_color,
            observaciones: r.observaciones,
            actividad: r.actividad,
            materiales: r.materiales,
            cita_id: r.cita_id,
          };
          return map;
        }, {} as Record<number, any>),
      };
    });

    return generales.map((g) => {
      const esp = especificosConProg.filter((e) => e.objetivo_general_id === g.id);
      const progreso = esp.length
        ? Math.round(esp.reduce((a, e) => a + e.progreso, 0) / esp.length)
        : 0;
      return { ...g, progreso, especificos: esp };
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Cabecera del plan
  // ────────────────────────────────────────────────────────────────

  async actualizarPlan(planId: number, body: any, user: any): Promise<any> {
    const plan = await this.planRepo.findOne({ where: { id: planId, flg_activo: 1 } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    for (const campo of ['metodologia', 'fecha_inicio', 'revision_cada', 'reunion_padres_cada']) {
      if (body[campo] !== undefined) plan[campo] = body[campo];
    }
    plan.user_id_actua = user?.id ?? null;
    return this.planRepo.save(plan);
  }

  // ────────────────────────────────────────────────────────────────
  // Objetivos generales
  // ────────────────────────────────────────────────────────────────

  private async getPlanOrFail(planId: number): Promise<PlanTerapeutico> {
    const plan = await this.planRepo.findOne({ where: { id: planId, flg_activo: 1 } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async crearGeneral(body: any, user: any): Promise<any> {
    const plan = await this.getPlanOrFail(body.plan_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    await this.assertPuedeGestionar(user, plan.servicio_id);

    const activos = await this.generalRepo.count({ where: { plan_id: plan.id, flg_activo: 1 } });
    if (activos >= MAX_GENERALES) {
      throw new BadRequestException(`Solo se permiten ${MAX_GENERALES} objetivos generales por plan`);
    }
    // El área debe pertenecer al servicio del plan.
    const area = await this.areaRepo.findOne({ where: { id: body.area_id, flg_activo: 1 } });
    if (!area || area.servicio_id !== plan.servicio_id) {
      throw new BadRequestException('El área no corresponde a este servicio');
    }

    const max = await this.generalRepo.query(
      `SELECT COALESCE(MAX(orden), -1) AS m FROM plan_objetivo_general WHERE plan_id = ?`,
      [plan.id],
    );
    const general = this.generalRepo.create({
      plan_id: plan.id,
      area_id: body.area_id,
      frecuencia_id: body.frecuencia_id ?? null,
      descripcion: body.descripcion ?? null,
      plazo_sesiones: body.plazo_sesiones ?? null,
      fecha_inicio: body.fecha_inicio ?? null,
      fecha_logro_est: body.fecha_logro_est ?? null,
      orden: Number(max[0]?.m ?? -1) + 1,
      user_id_crea: user?.id ?? null,
    });
    return this.generalRepo.save(general);
  }

  async editarGeneral(id: number, body: any, user: any): Promise<any> {
    const general = await this.generalRepo.findOne({ where: { id, flg_activo: 1 } });
    if (!general) throw new NotFoundException('Objetivo general no encontrado');
    const plan = await this.getPlanOrFail(general.plan_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    await this.assertPuedeGestionar(user, plan.servicio_id);

    if (body.area_id !== undefined && body.area_id !== general.area_id) {
      const area = await this.areaRepo.findOne({ where: { id: body.area_id, flg_activo: 1 } });
      if (!area || area.servicio_id !== plan.servicio_id) {
        throw new BadRequestException('El área no corresponde a este servicio');
      }
      general.area_id = body.area_id;
    }
    for (const campo of ['frecuencia_id', 'descripcion', 'plazo_sesiones', 'fecha_inicio', 'fecha_logro_est']) {
      if (body[campo] !== undefined) general[campo] = body[campo];
    }
    general.user_id_actua = user?.id ?? null;
    return this.generalRepo.save(general);
  }

  async eliminarGeneral(id: number, user: any): Promise<any> {
    const general = await this.generalRepo.findOne({ where: { id, flg_activo: 1 } });
    if (!general) throw new NotFoundException('Objetivo general no encontrado');
    const plan = await this.getPlanOrFail(general.plan_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    await this.assertPuedeGestionar(user, plan.servicio_id);
    general.flg_activo = 0;
    general.user_id_actua = user?.id ?? null;
    await this.generalRepo.save(general);
    return { ok: true };
  }

  // ────────────────────────────────────────────────────────────────
  // Objetivos específicos
  // ────────────────────────────────────────────────────────────────

  private async getGeneralConPlan(generalId: number): Promise<{ general: PlanObjetivoGeneral; plan: PlanTerapeutico }> {
    const general = await this.generalRepo.findOne({ where: { id: generalId, flg_activo: 1 } });
    if (!general) throw new NotFoundException('Objetivo general no encontrado');
    const plan = await this.getPlanOrFail(general.plan_id);
    return { general, plan };
  }

  async crearEspecifico(body: any, user: any): Promise<any> {
    const { general, plan } = await this.getGeneralConPlan(body.objetivo_general_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    await this.assertPuedeGestionar(user, plan.servicio_id);

    const activos = await this.especificoRepo.count({
      where: { objetivo_general_id: general.id, flg_activo: 1 },
    });
    if (activos >= MAX_ESPECIFICOS) {
      throw new BadRequestException(`Solo se permiten ${MAX_ESPECIFICOS} objetivos específicos por objetivo general`);
    }
    if (!body.descripcion?.trim()) throw new BadRequestException('La descripción es obligatoria');

    const max = await this.especificoRepo.query(
      `SELECT COALESCE(MAX(orden), -1) AS m FROM plan_objetivo_especifico WHERE objetivo_general_id = ?`,
      [general.id],
    );
    const esp = this.especificoRepo.create({
      objetivo_general_id: general.id,
      descripcion: body.descripcion,
      actividad_ejemplo: body.actividad_ejemplo ?? null,
      materiales: body.materiales ?? null,
      orden: Number(max[0]?.m ?? -1) + 1,
      user_id_crea: user?.id ?? null,
    });
    return this.especificoRepo.save(esp);
  }

  async editarEspecifico(id: number, body: any, user: any): Promise<any> {
    const esp = await this.especificoRepo.findOne({ where: { id, flg_activo: 1 } });
    if (!esp) throw new NotFoundException('Objetivo específico no encontrado');
    const { plan } = await this.getGeneralConPlan(esp.objetivo_general_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    await this.assertPuedeGestionar(user, plan.servicio_id);
    for (const campo of ['descripcion', 'actividad_ejemplo', 'materiales']) {
      if (body[campo] !== undefined) esp[campo] = body[campo];
    }
    esp.user_id_actua = user?.id ?? null;
    return this.especificoRepo.save(esp);
  }

  async eliminarEspecifico(id: number, user: any): Promise<any> {
    const esp = await this.especificoRepo.findOne({ where: { id, flg_activo: 1 } });
    if (!esp) throw new NotFoundException('Objetivo específico no encontrado');
    const { plan } = await this.getGeneralConPlan(esp.objetivo_general_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    await this.assertPuedeGestionar(user, plan.servicio_id);
    esp.flg_activo = 0;
    esp.user_id_actua = user?.id ?? null;
    await this.especificoRepo.save(esp);
    return { ok: true };
  }

  // ────────────────────────────────────────────────────────────────
  // Registro por sesión
  // ────────────────────────────────────────────────────────────────

  async guardarRegistro(body: any, user: any): Promise<any> {
    const esp = await this.especificoRepo.findOne({
      where: { id: body.objetivo_especifico_id, flg_activo: 1 },
    });
    if (!esp) throw new NotFoundException('Objetivo específico no encontrado');
    const { plan } = await this.getGeneralConPlan(esp.objetivo_general_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);

    const numeroSesion = Number(body.numero_sesion);
    if (!numeroSesion || numeroSesion < 1) throw new BadRequestException('Número de sesión inválido');

    const citas = await this.getCitasDeServicio(plan.paciente_id, plan.servicio_id);
    const cita = citas[numeroSesion - 1] || null;
    if (!this.puedeRegistrar(cita)) {
      throw new BadRequestException('Esta sesión no tiene una cita agendada para registrar el resultado');
    }

    const resultado = await this.resolverResultado(body.resultado, body.resultado_id);
    // Actividad y materiales solo los define quien gestiona objetivos (jefa/admin en Lenguaje).
    // La subordinada guarda resultado y observaciones; no toca actividad/materiales.
    const puedeGestionar = await this.puedeGestionarObjetivos(user, plan.servicio_id);

    // Buscar SIN filtrar por flg_activo: el índice único uq_reg (objetivo_especifico_id,
    // numero_sesion) no considera flg_activo, así que un registro desactivado debe reusarse
    // (reactivarse) en vez de insertar uno nuevo, que chocaría con el índice.
    let registro = await this.registroRepo.findOne({
      where: { objetivo_especifico_id: esp.id, numero_sesion: numeroSesion },
    });
    if (registro) {
      registro.resultado_id = resultado?.id ?? null;
      registro.observaciones = body.observaciones ?? null;
      if (puedeGestionar) {
        registro.actividad = body.actividad ?? null;
        registro.materiales = body.materiales ?? null;
      }
      registro.cita_id = cita.id;
      registro.fecha = this.fechaISO(cita.fecha);
      registro.registrado_por = user?.id ?? null;
      registro.flg_activo = 1;
    } else {
      registro = this.registroRepo.create({
        objetivo_especifico_id: esp.id,
        resultado_id: resultado?.id ?? null,
        numero_sesion: numeroSesion,
        cita_id: cita.id,
        observaciones: body.observaciones ?? null,
        actividad: puedeGestionar ? (body.actividad ?? null) : null,
        materiales: puedeGestionar ? (body.materiales ?? null) : null,
        fecha: this.fechaISO(cita.fecha),
        registrado_por: user?.id ?? null,
      });
    }
    await this.registroRepo.save(registro);

    // Asegurar que el objetivo quede asignado a esta sesión.
    await this.asegurarAsignacionSesion(plan.id, esp.id, numeroSesion, user);

    return { ok: true, id: registro.id };
  }

  /** Crea (o reactiva) la asignación objetivo↔sesión si no existe. */
  private async asegurarAsignacionSesion(
    planId: number,
    objetivoEspecificoId: number,
    numeroSesion: number,
    user: any,
  ): Promise<PlanBloqueObjetivo> {
    let asig = await this.bloqueObjetivoRepo.findOne({
      where: { objetivo_especifico_id: objetivoEspecificoId, numero_sesion: numeroSesion },
    });
    if (asig) {
      if (!asig.flg_activo) {
        asig.flg_activo = 1;
        asig.user_id_crea = user?.id ?? null;
        await this.bloqueObjetivoRepo.save(asig);
      }
      return asig;
    }
    asig = this.bloqueObjetivoRepo.create({
      plan_id: planId,
      objetivo_especifico_id: objetivoEspecificoId,
      numero_sesion: numeroSesion,
      user_id_crea: user?.id ?? null,
    });
    return this.bloqueObjetivoRepo.save(asig);
  }

  // ────────────────────────────────────────────────────────────────
  // Asignación de objetivos por sesión
  // ────────────────────────────────────────────────────────────────

  /** Asigna un objetivo específico a una sesión concreta. */
  async asignarObjetivoSesion(body: any, user: any): Promise<any> {
    const esp = await this.especificoRepo.findOne({
      where: { id: body.objetivo_especifico_id, flg_activo: 1 },
    });
    if (!esp) throw new NotFoundException('Objetivo específico no encontrado');
    const { plan } = await this.getGeneralConPlan(esp.objetivo_general_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    await this.assertPuedeGestionar(user, plan.servicio_id);

    const numeroSesion = Number(body.numero_sesion);
    if (!numeroSesion || numeroSesion < 1) throw new BadRequestException('Número de sesión inválido');

    const asig = await this.asegurarAsignacionSesion(plan.id, esp.id, numeroSesion, user);
    return { ok: true, id: asig.id };
  }

  /** Quita un objetivo de una sesión (y borra el registro de ese objetivo en esa sesión). */
  async desasignarObjetivoSesion(especificoId: number, numeroSesion: number, user: any): Promise<any> {
    const esp = await this.especificoRepo.findOne({ where: { id: especificoId, flg_activo: 1 } });
    if (!esp) throw new NotFoundException('Objetivo específico no encontrado');
    const { plan } = await this.getGeneralConPlan(esp.objetivo_general_id);
    await this.assertAcceso(user, plan.paciente_id, plan.servicio_id);
    await this.assertPuedeGestionar(user, plan.servicio_id);
    if (!numeroSesion || numeroSesion < 1) throw new BadRequestException('Número de sesión inválido');

    await this.bloqueObjetivoRepo.update(
      { objetivo_especifico_id: especificoId, numero_sesion: numeroSesion },
      { flg_activo: 0 },
    );

    // Desactivar el registro de ese objetivo en esa sesión.
    await this.registroRepo
      .createQueryBuilder()
      .update()
      .set({ flg_activo: 0 })
      .where('objetivo_especifico_id = :id', { id: especificoId })
      .andWhere('numero_sesion = :numeroSesion', { numeroSesion })
      .andWhere('flg_activo = 1')
      .execute();

    return { ok: true };
  }

  private async resolverResultado(codigo?: string, resultadoId?: number): Promise<PlanResultado | null> {
    // Sin resultado → registro de solo observación (permitido).
    if (!resultadoId && !codigo) return null;
    let res: PlanResultado | null = null;
    if (resultadoId) res = await this.resultadoRepo.findOne({ where: { id: resultadoId, flg_activo: 1 } });
    else if (codigo) res = await this.resultadoRepo.findOne({ where: { codigo, flg_activo: 1 } });
    if (!res) throw new BadRequestException('Resultado inválido');
    return res;
  }
}
