import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SolicitudInforme } from './entities/solicitud-informe.entity';
import { ModalidadPago } from './entities/modalidad-pago.entity';
import { EstadoPago } from './entities/estado-pago.entity';
import { EstadoSolicitudInforme } from './entities/estado-solicitud-informe.entity';
import { RevisionInforme } from './entities/revision-informe.entity';

import {
  CreateSolicitudInformeDto,
  UpdateSolicitudInformeDto,
  SubirArchivoDto,
  RevisarInformeDto,
  MarcarEntregadoDto,
} from './dto/solicitud-informe.dto';

import { NotificacionesService } from '../notificaciones/notificaciones.service';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

export const ESTADO_SOLICITUD = {
  PENDIENTE_SUBIDA:   1,
  PENDIENTE_REVISION: 2,
  RECHAZADO:          3,
  APROBADO:           4,
  ENTREGADO:          5,
} as const;

const ROL_ADMIN     = 1;
const ROL_ADMISION  = 2;
const ROL_TERAPEUTA = 4;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE VISTA POR ROL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campos que NUNCA debe ver la terapeuta ni la jefa:
 *  - modalidad_pago
 *  - estado_pago
 *  - monto / monto_pago (cualquier campo financiero en la entidad)
 *  - venta_servicio (toda la relación de venta)
 */
const CAMPOS_OCULTOS_TERAPEUTA = [
  'modalidad_pago',
  'estado_pago',
  'monto',
  'monto_pago',
  'precio',
  'venta_servicio',
  'venta_servicio_id',
] as const;

export type VistaRol = 'admin' | 'admision' | 'terapeuta' | 'jefa';

/**
 * Limpia del objeto los campos financieros/de venta.
 * Se aplica cuando el rol es 'terapeuta' o 'jefa'.
 */
function sanitizarParaTerapeuta(solicitud: SolicitudInforme): Partial<SolicitudInforme> {
  const obj: any = { ...solicitud };
  for (const campo of CAMPOS_OCULTOS_TERAPEUTA) {
    delete obj[campo];
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE NOMBRE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construye el nombre completo del paciente (nombres y apellidos completos).
 * venta_servicio → paciente → nombres / apellidos
 */
function nombreCompletoPaciente(s: SolicitudInforme): string {
  const p = (s as any).venta_servicio?.paciente;
  if (!p) return 'paciente desconocido';
  const nombre = [p.nombres, p.apellido_paterno, p.apellido_materno]
    .filter(Boolean)
    .join(' ');
  return nombre || `paciente #${p.id}`;
}

/**
 * Nombre del tipo de informe (tipo_archivo.nombre o fallback).
 */
function nombreTipoInforme(s: SolicitudInforme): string {
  return (s as any).tipo_archivo?.nombre ?? 'Informe';
}

/**
 * Construye el nombre completo del especialista (nombres y apellidos completos).
 */
function nombreCompletoEspecialista(s: SolicitudInforme): string {
  const e = (s as any).especialista;
  if (!e) return 'terapeuta';
  const nombre = [e.nombres, e.apellido_paterno, e.apellido_materno]
    .filter(Boolean)
    .join(' ');
  return nombre || `terapeuta #${e.id}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICIO
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SolicitudInformeService {
  constructor(
    @InjectRepository(SolicitudInforme)
    private readonly solicitudRepo: Repository<SolicitudInforme>,

    @InjectRepository(ModalidadPago)
    private readonly modalidadPagoRepo: Repository<ModalidadPago>,

    @InjectRepository(EstadoPago)
    private readonly estadoPagoRepo: Repository<EstadoPago>,

    @InjectRepository(EstadoSolicitudInforme)
    private readonly estadoSolicitudRepo: Repository<EstadoSolicitudInforme>,

    @InjectRepository(RevisionInforme)
    private readonly revisionRepo: Repository<RevisionInforme>,

    private readonly notificacionesService: NotificacionesService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // QUERY BUILDER BASE  (reutilizado en todos los métodos)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * QueryBuilder completo con todas las relaciones necesarias.
   * Los métodos que necesitan filtrar por paciente / especialista
   * añaden el .where() correspondiente antes de llamar a getOne/getMany.
   */
  private baseQuery() {
    return this.solicitudRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.tipo_archivo',          'tipo_archivo')
      .leftJoinAndSelect('si.especialista',          'especialista')
      .leftJoinAndSelect('especialista.cargo',       'cargo')
      .leftJoinAndSelect('si.modalidad_pago',        'modalidad_pago')
      .leftJoinAndSelect('si.estado_pago',           'estado_pago')
      .leftJoinAndSelect('si.estado_solicitud',      'estado_solicitud')
      .leftJoinAndSelect('si.revisor',               'revisor')
      .leftJoinAndSelect('si.venta_servicio',        'venta_servicio')
      .leftJoinAndSelect('venta_servicio.paciente',  'paciente');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD BASE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Solo Admin (ROL 1) o Admisión (ROL 2) pueden crear.
   * Si se pasa rolCreador se valida aquí; de lo contrario se confía en el guard.
   */
  async create(
    dto: CreateSolicitudInformeDto,
    rolCreador?: number,
  ): Promise<SolicitudInforme> {
    // Validación de rol
    if (rolCreador !== undefined && rolCreador !== ROL_ADMIN && rolCreador !== ROL_ADMISION) {
      throw new ForbiddenException(
        'Solo el Administrador o Admisión pueden crear solicitudes de informe.',
      );
    }

    // Unicidad por venta
    if (dto.venta_servicio_id) {
      const existe = await this.solicitudRepo.findOne({
        where: { venta_servicio_id: dto.venta_servicio_id },
      });
      if (existe) {
        throw new BadRequestException(
          `Esta venta ya fue utilizada para la solicitud #${existe.id}. ` +
          'No se puede reutilizar la misma venta.',
        );
      }
    }

    const solicitud = this.solicitudRepo.create({
      ...dto,
      estado_solicitud_id: ESTADO_SOLICITUD.PENDIENTE_SUBIDA,
    });
    const resultado = await this.solicitudRepo.save(solicitud);

    // Necesitamos el objeto completo para construir mensajes descriptivos
    const completa = await this.findOne(resultado.id);
    const pacienteNombreCompleto  = nombreCompletoPaciente(completa);
    const tipoInforme = nombreTipoInforme(completa);
    const terapeutaNombreCompleto = nombreCompletoEspecialista(completa);

    // Fecha límite de entrega (si existe en el DTO)
    const fechaLimite = (dto as any).fecha_limite_entrega
      ? new Date((dto as any).fecha_limite_entrega).toLocaleDateString('es-PE', {
          day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima',
        })
      : null;
    const textoFecha = fechaLimite ? ` La fecha límite de entrega es el ${fechaLimite}.` : '';

    try {
      const evento = await this.notificacionesService.crearEvento({
        tipo_evento: 'SOLICITUD_INFORME_CREADA',
        descripcion: `Nueva solicitud de ${tipoInforme} para el paciente ${pacienteNombreCompleto} asignada a ${terapeutaNombreCompleto}`,
        usuario_id:  resultado.especialista_id,
        datos_adicionales: {
          solicitud_id:            resultado.id,
          especialista_id:         resultado.especialista_id,
          paciente_nombre:         pacienteNombreCompleto,
          tipo_informe:            tipoInforme,
          fecha_limite:            fechaLimite,
          terapeutas_destinatarios: [resultado.especialista_id],
        },
      });

      await this.notificacionesService.crearNotificacion({
        tipo_notificacion: 'SOLICITUD_INFORME',
        titulo:   `Nueva Solicitud de Informe`,
        mensaje:  `Se te ha asignado la elaboración del ${tipoInforme} para el paciente ${pacienteNombreCompleto}.${textoFecha} Por favor, sube el archivo cuando esté listo.`,
        evento_id: evento.id,
        roles_destino: [ROL_TERAPEUTA],
      });
    } catch (err) {
      console.error('⚠️  Error al notificar nueva solicitud al terapeuta:', err);
    }

    return completa;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FIND ALL  (solo Admin y Admisión — ven todo)
  // ──────────────────────────────────────────────────────────────────────────

  async findAll(): Promise<SolicitudInforme[]> {
    return this.baseQuery()
      .orderBy('si.fecha_solicitud', 'DESC')
      .getMany();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FIND ONE  (interno — siempre con todas las relaciones)
  // ──────────────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<SolicitudInforme> {
    const s = await this.baseQuery()
      .where('si.id = :id', { id })
      .getOne();

    if (!s) throw new NotFoundException(`Solicitud de informe #${id} no encontrada`);
    return s;
  }

  /**
   * findOne expuesto al controlador con sanitización por rol.
   *
   * - 'admin' | 'admision' → ven todo
   * - 'terapeuta' | 'jefa' → sin datos financieros ni de venta
   */
  async findOneByRol(
    id: number,
    vista: VistaRol,
  ): Promise<SolicitudInforme | Partial<SolicitudInforme>> {
    const s = await this.findOne(id);
    if (vista === 'terapeuta' || vista === 'jefa') {
      return sanitizarParaTerapeuta(s);
    }
    return s;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FIND BY PACIENTE
  // ──────────────────────────────────────────────────────────────────────────

  async findByPaciente(
    pacienteId: number,
    vista: VistaRol = 'admin',
  ): Promise<Array<SolicitudInforme | Partial<SolicitudInforme>>> {
    const solicitudes = await this.baseQuery()
      .where('paciente.id = :pacienteId', { pacienteId })
      .orderBy('si.fecha_solicitud', 'DESC')
      .getMany();

    if (vista === 'terapeuta' || vista === 'jefa') {
      return solicitudes.map(sanitizarParaTerapeuta);
    }
    return solicitudes;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FIND BY ESPECIALISTA  (terapeuta ve sus propias solicitudes — sin datos fin.)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * La terapeuta (y la jefa) solo ven:
   *  - tipo_archivo (nombre del informe a elaborar)
   *  - estado_solicitud
   *  - archivo_url (para saber si ya subió algo)
   *  - fecha_solicitud
   *  - fecha_limite_entrega
   *  - comentarios de revisión (en endpoint separado)
   *  - nombre del paciente (de venta_servicio → paciente)
   *
   * Todo lo financiero se elimina con sanitizarParaTerapeuta.
   */
  async findByEspecialista(
    especialistaId: number,
  ): Promise<Partial<SolicitudInforme>[]> {
    const solicitudes = await this.baseQuery()
      .where('si.especialista_id = :especialistaId', { especialistaId })
      .orderBy('si.fecha_solicitud', 'DESC')
      .getMany();

    return solicitudes.map(sanitizarParaTerapeuta);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE / DELETE  (solo Admin y Admisión)
  // ──────────────────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateSolicitudInformeDto): Promise<SolicitudInforme> {
    await this.solicitudRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const s = await this.findOne(id);
    await this.solicitudRepo.remove(s);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 1: TERAPEUTA SUBE EL ARCHIVO
  // ══════════════════════════════════════════════════════════════════════════

  async subirArchivo(id: number, dto: SubirArchivoDto): Promise<Partial<SolicitudInforme>> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado_solicitud_id === ESTADO_SOLICITUD.APROBADO) {
      throw new BadRequestException('El informe ya fue aprobado y no puede modificarse.');
    }
    if (solicitud.estado_solicitud_id === ESTADO_SOLICITUD.ENTREGADO) {
      throw new BadRequestException('El informe ya fue entregado al paciente.');
    }

    // 🔍 Verificar si la terapeuta asignada ES JEFA
    // Si es jefa, aprueba automáticamente (sin necesidad de revisión por otra persona)
    const terapeutaEsJefa = Boolean((solicitud.especialista as any)?.cargo?.es_jefe);
    const nuevoEstado = terapeutaEsJefa
      ? ESTADO_SOLICITUD.APROBADO
      : ESTADO_SOLICITUD.PENDIENTE_REVISION;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DEBUG - Subir archivo informe #' + id);
    console.log('👩‍⚕️ Terapeuta:', (solicitud.especialista as any)?.nombres);
    console.log('👔 Es jefa?:', terapeutaEsJefa);
    console.log('📋 Nuevo estado:', nuevoEstado === ESTADO_SOLICITUD.APROBADO ? 'APROBADO (directo)' : 'PENDIENTE_REVISION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await this.solicitudRepo.update(id, {
      archivo_url:          dto.archivo_url,
      fecha_subida_archivo: new Date(),
      estado_solicitud_id:  nuevoEstado,
      user_actua_id:        dto.user_actua_id,
      // Si es jefa, también marcamos como revisado por ella misma
      ...(terapeutaEsJefa ? {
        fecha_revision: new Date(),
        revisor_id: solicitud.especialista_id,
      } : {}),
    });

    // Datos descriptivos para notificación
    const pacienteNombreCompleto  = nombreCompletoPaciente(solicitud);
    const tipoInforme = nombreTipoInforme(solicitud);
    const terapeutaNombreCompleto = nombreCompletoEspecialista(solicitud);

    // Verificar si es una re-subida (corrección tras rechazo)
    const esCorreccion = solicitud.estado_solicitud_id === ESTADO_SOLICITUD.RECHAZADO;

    try {
      if (terapeutaEsJefa) {
        // ── Si es jefa: Notificar a ADMISIÓN que puede entregar (sin revisión) ──
        const evento = await this.notificacionesService.crearEvento({
          tipo_evento: 'INFORME_APROBADO',
          descripcion: `El ${tipoInforme} del paciente ${pacienteNombreCompleto} fue aprobado automáticamente (terapeuta con cargo de jefa)`,
          usuario_id:  dto.user_actua_id ?? solicitud.especialista_id,
          datos_adicionales: {
            solicitud_id:    id,
            especialista_id: solicitud.especialista_id,
            paciente_nombre: pacienteNombreCompleto,
            tipo_informe:    tipoInforme,
            terapeuta_nombre: terapeutaNombreCompleto,
            auto_aprobado: true,
          },
        });

        await this.notificacionesService.crearNotificacion({
          tipo_notificacion: 'SOLICITUD_INFORME',
          titulo:   `Informe Listo para Entrega`,
          mensaje:  `El ${tipoInforme} del paciente ${pacienteNombreCompleto}, elaborado por ${terapeutaNombreCompleto}, ha sido aprobado automáticamente y está listo para ser entregado.`,
          evento_id: evento.id,
          roles_destino: [ROL_ADMISION],
        });

        // También crear registro de auto-revisión en el historial
        const revision = this.revisionRepo.create({
          solicitud_informe_id: id,
          revisor_id:           solicitud.especialista_id,
          estado_id:            ESTADO_SOLICITUD.APROBADO,
          comentario:           'Aprobado automáticamente (terapeuta con cargo de jefa)',
          fecha_revision:       new Date(),
        });
        await this.revisionRepo.save(revision);

      } else {
        // ── Si NO es jefa: Notificar a la JEFA para revisión ──
        const tituloNotificacion = esCorreccion
          ? `Informe Corregido - Pendiente de Revisión`
          : `Nuevo Informe - Pendiente de Revisión`;

        const mensajeNotificacion = esCorreccion
          ? `${terapeutaNombreCompleto} ha corregido y vuelto a subir el ${tipoInforme} del paciente ${pacienteNombreCompleto}. Por favor, revisa el documento corregido.`
          : `${terapeutaNombreCompleto} ha subido el ${tipoInforme} del paciente ${pacienteNombreCompleto}. Por favor, revisa y aprueba o rechaza el documento.`;

        const evento = await this.notificacionesService.crearEvento({
          tipo_evento: 'INFORME_PENDIENTE_REVISION',
          descripcion: esCorreccion
            ? `${terapeutaNombreCompleto} corrigió el ${tipoInforme} del paciente ${pacienteNombreCompleto}`
            : `${terapeutaNombreCompleto} subió el ${tipoInforme} del paciente ${pacienteNombreCompleto}`,
          usuario_id:  dto.user_actua_id ?? solicitud.especialista_id,
          datos_adicionales: {
            solicitud_id:    id,
            especialista_id: solicitud.especialista_id,
            paciente_nombre: pacienteNombreCompleto,
            tipo_informe:    tipoInforme,
            terapeuta_nombre: terapeutaNombreCompleto,
            es_correccion: esCorreccion,
          },
        });

        await this.notificacionesService.crearNotificacion({
          tipo_notificacion: 'SOLICITUD_INFORME',
          titulo:   tituloNotificacion,
          mensaje:  mensajeNotificacion,
          evento_id: evento.id,
          roles_destino: [ROL_ADMIN],  // La jefa tiene rol ADMIN o puede ser ROL_TERAPEUTA con es_jefe=true
        });
      }
    } catch (err) {
      console.error('⚠️  Error al notificar sobre archivo subido:', err);
    }

    // La terapeuta recibe de vuelta su vista (sin datos financieros)
    const actualizada = await this.findOne(id);
    return sanitizarParaTerapeuta(actualizada);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 2: JEFA REVISA (APRUEBA / RECHAZA)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Solo puede revisar quien tenga cargo.es_jefe = true.
   * Si se pasa esJefe = false se lanza ForbiddenException.
   */
  async revisarInforme(
    id: number,
    dto: RevisarInformeDto,
    esJefe: boolean = true,
  ): Promise<Partial<SolicitudInforme>> {
    if (!esJefe) {
      throw new ForbiddenException(
        'Solo la jefa / supervisora puede aprobar o rechazar informes.',
      );
    }

    const solicitud = await this.findOne(id);

    if (solicitud.estado_solicitud_id !== ESTADO_SOLICITUD.PENDIENTE_REVISION) {
      throw new BadRequestException(
        'Solo se pueden revisar informes en estado "Pendiente Revisión".',
      );
    }

    const estadosPermitidos = [ESTADO_SOLICITUD.RECHAZADO, ESTADO_SOLICITUD.APROBADO];
    if (!estadosPermitidos.includes(dto.estado_id as any)) {
      throw new BadRequestException('estado_id debe ser 3 (Rechazado) o 4 (Aprobado).');
    }

    if (dto.estado_id === ESTADO_SOLICITUD.RECHAZADO && !dto.comentario?.trim()) {
      throw new BadRequestException(
        'El comentario es obligatorio al rechazar un informe.',
      );
    }

    // Guardar revisión en historial
    const revision = this.revisionRepo.create({
      solicitud_informe_id: id,
      revisor_id:           dto.revisor_id,
      estado_id:            dto.estado_id,
      comentario:           dto.comentario ?? null,
      fecha_revision:       new Date(),
    });
    await this.revisionRepo.save(revision);

    // Actualizar solicitud
    await this.solicitudRepo.update(id, {
      estado_solicitud_id: dto.estado_id,
      fecha_revision:      new Date(),
      revisor_id:          dto.revisor_id,
    });

    // Datos descriptivos
    const pacienteNombreCompleto  = nombreCompletoPaciente(solicitud);
    const tipoInforme = nombreTipoInforme(solicitud);
    const terapeutaNombreCompleto = nombreCompletoEspecialista(solicitud);

    try {
      if (dto.estado_id === ESTADO_SOLICITUD.RECHAZADO) {
        // ── Notificar a la TERAPEUTA que fue rechazado ──────────────────────
        const evento = await this.notificacionesService.crearEvento({
          tipo_evento: 'INFORME_RECHAZADO',
          descripcion: `El ${tipoInforme} del paciente ${pacienteNombreCompleto} fue rechazado`,
          usuario_id:  dto.revisor_id,
          datos_adicionales: {
            solicitud_id:            id,
            especialista_id:         solicitud.especialista_id,
            paciente_nombre:         pacienteNombreCompleto,
            tipo_informe:            tipoInforme,
            comentario:              dto.comentario,
            terapeutas_destinatarios: [solicitud.especialista_id],
          },
        });

        await this.notificacionesService.crearNotificacion({
          tipo_notificacion: 'SOLICITUD_INFORME',
          titulo:   `Informe Rechazado`,
          mensaje:  `Tu ${tipoInforme} del paciente ${pacienteNombreCompleto} ha sido rechazado. Motivo: "${dto.comentario}". Por favor, realiza las correcciones necesarias y vuelve a subir el archivo.`,
          evento_id: evento.id,
          roles_destino: [ROL_TERAPEUTA],
        });

      } else {
        // ── Notificar a ADMISIÓN que puede entregar ────────────────────────
        const evento = await this.notificacionesService.crearEvento({
          tipo_evento: 'INFORME_APROBADO',
          descripcion: `El ${tipoInforme} del paciente ${pacienteNombreCompleto} fue aprobado`,
          usuario_id:  dto.revisor_id,
          datos_adicionales: {
            solicitud_id:    id,
            paciente_nombre: pacienteNombreCompleto,
            tipo_informe:    tipoInforme,
            terapeuta_nombre: terapeutaNombreCompleto,
          },
        });

        await this.notificacionesService.crearNotificacion({
          tipo_notificacion: 'SOLICITUD_INFORME',
          titulo:   `Informe Listo para Entrega`,
          mensaje:  `El ${tipoInforme} del paciente ${pacienteNombreCompleto}, elaborado por ${terapeutaNombreCompleto}, ha sido aprobado y está listo para ser entregado.`,
          evento_id: evento.id,
          roles_destino: [ROL_ADMISION],
        });
      }
    } catch (err) {
      console.error('⚠️  Error al enviar notificación de revisión:', err);
    }

    // La jefa ve su vista (igual que la terapeuta: sin datos financieros)
    const actualizada = await this.findOne(id);
    return sanitizarParaTerapeuta(actualizada);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 3: ADMISIÓN MARCA COMO ENTREGADO
  // ══════════════════════════════════════════════════════════════════════════

  async marcarEntregado(id: number, dto: MarcarEntregadoDto): Promise<SolicitudInforme> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado_solicitud_id !== ESTADO_SOLICITUD.APROBADO) {
      throw new BadRequestException(
        'Solo se pueden marcar como entregados los informes con estado "Aprobado".',
      );
    }

    await this.solicitudRepo.update(id, {
      estado_solicitud_id: ESTADO_SOLICITUD.ENTREGADO,
      ...(dto.user_actua_id ? { user_actua_id: dto.user_actua_id } : {}),
    });

    const pacienteNombreCompleto = nombreCompletoPaciente(solicitud);
    const tipoInforme = nombreTipoInforme(solicitud);

    // Notificación informativa al Admin (opcional, útil para trazabilidad)
    try {
      const evento = await this.notificacionesService.crearEvento({
        tipo_evento: 'INFORME_ENTREGADO',
        descripcion: `El ${tipoInforme} del paciente ${pacienteNombreCompleto} fue entregado`,
        usuario_id:  dto.user_actua_id ?? 0,
        datos_adicionales: {
          solicitud_id:    id,
          paciente_nombre: pacienteNombreCompleto,
          tipo_informe:    tipoInforme,
        },
      });

      await this.notificacionesService.crearNotificacion({
        tipo_notificacion: 'SOLICITUD_INFORME',
        titulo:   `Informe Entregado`,
        mensaje:  `El ${tipoInforme} del paciente ${pacienteNombreCompleto} ha sido entregado exitosamente. Solicitud #${id} completada.`,
        evento_id: evento.id,
        roles_destino: [ROL_ADMIN],
      });
    } catch (err) {
      console.error('⚠️  Error al notificar entrega al admin:', err);
    }

    return this.findOne(id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORIAL DE REVISIONES
  // ══════════════════════════════════════════════════════════════════════════

  async findRevisiones(solicitudId: number): Promise<RevisionInforme[]> {
    return this.revisionRepo.find({
      where:     { solicitud_informe_id: solicitudId },
      relations: ['revisor', 'estado'],
      order:     { fecha_revision: 'DESC' },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CATÁLOGOS
  // ══════════════════════════════════════════════════════════════════════════

  async findAllModalidadesPago(): Promise<ModalidadPago[]> {
    return this.modalidadPagoRepo.find();
  }

  async findAllEstadosPago(): Promise<EstadoPago[]> {
    return this.estadoPagoRepo.find();
  }

  async findAllEstadosSolicitud(): Promise<EstadoSolicitudInforme[]> {
    return this.estadoSolicitudRepo.find();
  }
}