import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

/** IDs del catálogo estado_solicitud_informe */
export const ESTADO_SOLICITUD = {
  PENDIENTE_SUBIDA: 1,
  PENDIENTE_REVISION: 2,
  RECHAZADO: 3,
  APROBADO: 4,
  ENTREGADO: 5,
} as const;

/** IDs de roles (mismo que notificaciones.service.ts) */
const ROL_ADMIN     = 1;
const ROL_ADMISION  = 2;
const ROL_TERAPEUTA = 4;

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

  // ════════════════════════════════════════════════════════════════
  // CRUD BASE
  // ════════════════════════════════════════════════════════════════

  async create(dto: CreateSolicitudInformeDto): Promise<SolicitudInforme> {
    // Validar que la venta no esté usada en otra solicitud
    if (dto.venta_servicio_id) {
      const existe = await this.solicitudRepo.findOne({
        where: { venta_servicio_id: dto.venta_servicio_id },
      });
      if (existe) {
        throw new BadRequestException(
          `Esta venta ya fue utilizada para la solicitud #${existe.id}. ` +
            'No se puede reutilizar la misma venta para crear múltiples solicitudes.',
        );
      }
    }

    const solicitud = this.solicitudRepo.create({
      ...dto,
      estado_solicitud_id: ESTADO_SOLICITUD.PENDIENTE_SUBIDA,
    });
    const resultado = await this.solicitudRepo.save(solicitud);

    // ── Notificar a la terapeuta asignada (ROL_TERAPEUTA) ──────────────────
    try {
      const evento = await this.notificacionesService.crearEvento({
        tipo_evento: 'SOLICITUD_INFORME_CREADA',
        descripcion: `Nueva solicitud de informe asignada al especialista #${resultado.especialista_id}`,
        usuario_id: resultado.especialista_id,
        datos_adicionales: {
          solicitud_id: resultado.id,
          especialista_id: resultado.especialista_id,
          // Guardamos el id del especialista para que el front pueda filtrar
          // igual que hace notificarDocumentoSubido con terapeutas_destinatarios
          terapeutas_destinatarios: [resultado.especialista_id],
        },
      });

      await this.notificacionesService.crearNotificacion({
        tipo_notificacion: 'SOLICITUD_INFORME',
        titulo: 'Nueva solicitud de informe',
        mensaje: `Se te ha asignado una nueva solicitud de informe. Por favor, sube el archivo correspondiente.`,
        evento_id: evento.id,
        roles_destino: [ROL_TERAPEUTA],
      });
    } catch (err) {
      console.error('⚠️  Error al enviar notificación a terapeuta:', err);
    }

    return resultado;
  }

  async findAll(): Promise<SolicitudInforme[]> {
    return this.solicitudRepo.find({
      relations: ['estado_solicitud'],
      order: { fecha_solicitud: 'DESC' },
    });
  }

  async findOne(id: number): Promise<SolicitudInforme> {
    const s = await this.solicitudRepo.findOne({
      where: { id },
      relations: [
        'venta_servicio',
        'venta_servicio.paciente',
        'estado_solicitud',
        'revisor',
      ],
    });
    if (!s) throw new NotFoundException(`Solicitud de informe #${id} no encontrada`);
    return s;
  }

  async findByPaciente(pacienteId: number): Promise<SolicitudInforme[]> {
    return this.solicitudRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.servicio', 'servicio')
      .leftJoinAndSelect('si.tipo_archivo', 'tipo_archivo')
      .leftJoinAndSelect('si.especialista', 'especialista')
      .leftJoinAndSelect('si.modalidad_pago', 'modalidad_pago')
      .leftJoinAndSelect('si.estado_pago', 'estado_pago')
      .leftJoinAndSelect('si.estado_solicitud', 'estado_solicitud')
      .leftJoinAndSelect('si.revisor', 'revisor')
      .leftJoinAndSelect('si.venta_servicio', 'venta_servicio')
      .leftJoinAndSelect('venta_servicio.paciente', 'paciente')
      .where('paciente.id = :pacienteId', { pacienteId })
      .orderBy('si.fecha_solicitud', 'DESC')
      .getMany();
  }

  async findByEspecialista(especialistaId: number): Promise<SolicitudInforme[]> {
    return this.solicitudRepo.find({
      where: { especialista_id: especialistaId },
      relations: ['estado_solicitud'],
      order: { fecha_solicitud: 'DESC' },
    });
  }

  async update(id: number, dto: UpdateSolicitudInformeDto): Promise<SolicitudInforme> {
    const solicitud = await this.findOne(id);
    return this.solicitudRepo.save(this.solicitudRepo.merge(solicitud, dto));
  }

  async remove(id: number): Promise<void> {
    const s = await this.findOne(id);
    await this.solicitudRepo.remove(s);
  }

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 1: TERAPEUTA SUBE EL ARCHIVO
  // ════════════════════════════════════════════════════════════════

  /**
   * La terapeuta sube la URL del archivo del informe.
   * El estado pasa de "Pendiente Subida" → "Pendiente Revisión".
   * Se notifica al Admin/Jefa (ROL_ADMIN).
   */
  async subirArchivo(id: number, dto: SubirArchivoDto): Promise<SolicitudInforme> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado_solicitud_id === ESTADO_SOLICITUD.APROBADO) {
      throw new BadRequestException('El informe ya fue aprobado y no puede modificarse.');
    }
    if (solicitud.estado_solicitud_id === ESTADO_SOLICITUD.ENTREGADO) {
      throw new BadRequestException('El informe ya fue entregado al paciente.');
    }

    solicitud.archivo_url = dto.archivo_url;
    solicitud.fecha_subida_archivo = new Date();
    solicitud.estado_solicitud_id = ESTADO_SOLICITUD.PENDIENTE_REVISION;
    if (dto.user_actua_id) solicitud.user_actua_id = dto.user_actua_id;

    const resultado = await this.solicitudRepo.save(solicitud);

    // ── Notificar a la jefa/admin (ROL_ADMIN) ─────────────────────────────
    try {
      const evento = await this.notificacionesService.crearEvento({
        tipo_evento: 'INFORME_PENDIENTE_REVISION',
        descripcion: `Informe subido para revisión - solicitud #${id}`,
        usuario_id: dto.user_actua_id ?? solicitud.especialista_id,
        datos_adicionales: {
          solicitud_id: id,
          especialista_id: solicitud.especialista_id,
        },
      });

      await this.notificacionesService.crearNotificacion({
        tipo_notificacion: 'SOLICITUD_INFORME',
        titulo: 'Informe listo para revisión',
        mensaje: `La terapeuta subió el informe de la solicitud #${id}. Está pendiente de tu revisión.`,
        evento_id: evento.id,
        roles_destino: [ROL_ADMIN],
      });
    } catch (err) {
      console.error('⚠️  Error al notificar a la jefa:', err);
    }

    return resultado;
  }

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 2: JEFA REVISA EL INFORME (APRUEBA / RECHAZA)
  // ════════════════════════════════════════════════════════════════

  /**
   * La jefa revisa el informe.
   * estado_id = 3 → Rechazado  (comentario obligatorio)
   * estado_id = 4 → Aprobado
   * Se guarda historial en revision_informe y se actualiza solicitud_informe.
   */
  async revisarInforme(id: number, dto: RevisarInformeDto): Promise<SolicitudInforme> {
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
        'El comentario es obligatorio cuando se rechaza un informe.',
      );
    }

    // Guardar historial de revisión
    const revision = this.revisionRepo.create({
      solicitud_informe_id: id,
      revisor_id: dto.revisor_id,
      estado_id: dto.estado_id,
      comentario: dto.comentario ?? null,
      fecha_revision: new Date(),
    });
    await this.revisionRepo.save(revision);

    // Actualizar solicitud
    solicitud.estado_solicitud_id = dto.estado_id;
    solicitud.fecha_revision = new Date();
    solicitud.revisor_id = dto.revisor_id;
    const resultado = await this.solicitudRepo.save(solicitud);

    // ── Notificaciones ─────────────────────────────────────────────────────
    try {
      if (dto.estado_id === ESTADO_SOLICITUD.RECHAZADO) {
        // Rechazado → notificar a la terapeuta para que corrija (ROL_TERAPEUTA)
        const evento = await this.notificacionesService.crearEvento({
          tipo_evento: 'INFORME_RECHAZADO',
          descripcion: `Informe de solicitud #${id} rechazado por revisor`,
          usuario_id: dto.revisor_id,
          datos_adicionales: {
            solicitud_id: id,
            especialista_id: solicitud.especialista_id,
            comentario: dto.comentario,
            // Filtro para que solo vea la notificación la terapeuta correcta
            terapeutas_destinatarios: [solicitud.especialista_id],
          },
        });

        await this.notificacionesService.crearNotificacion({
          tipo_notificacion: 'SOLICITUD_INFORME',
          titulo: 'Informe rechazado – requiere correcciones',
          mensaje:
            `Tu informe de la solicitud #${id} fue rechazado. ` +
            `Comentario: "${dto.comentario}". Por favor, corrígelo y vuelve a subir el archivo.`,
          evento_id: evento.id,
          roles_destino: [ROL_TERAPEUTA],
        });
      } else {
        // Aprobado → notificar a admisión para que entregue al paciente (ROL_ADMISION)
        const evento = await this.notificacionesService.crearEvento({
          tipo_evento: 'INFORME_APROBADO',
          descripcion: `Informe de solicitud #${id} aprobado, listo para entrega`,
          usuario_id: dto.revisor_id,
          datos_adicionales: {
            solicitud_id: id,
          },
        });

        await this.notificacionesService.crearNotificacion({
          tipo_notificacion: 'SOLICITUD_INFORME',
          titulo: 'Informe aprobado – listo para entrega',
          mensaje: `El informe de la solicitud #${id} fue aprobado. Ya puede ser entregado al paciente.`,
          evento_id: evento.id,
          roles_destino: [ROL_ADMISION],
        });
      }
    } catch (err) {
      console.error('⚠️  Error al enviar notificación de revisión:', err);
    }

    return resultado;
  }

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 3: ADMISIÓN MARCA COMO ENTREGADO
  // ════════════════════════════════════════════════════════════════

  /**
   * Admisión confirma que el informe fue entregado al paciente/responsable.
   * Estado pasa de "Aprobado" → "Entregado".
   */
  async marcarEntregado(id: number, dto: MarcarEntregadoDto): Promise<SolicitudInforme> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado_solicitud_id !== ESTADO_SOLICITUD.APROBADO) {
      throw new BadRequestException(
        'Solo se pueden marcar como entregados los informes con estado "Aprobado".',
      );
    }

    solicitud.estado_solicitud_id = ESTADO_SOLICITUD.ENTREGADO;
    if (dto.user_actua_id) solicitud.user_actua_id = dto.user_actua_id;

    return this.solicitudRepo.save(solicitud);
  }

  // ════════════════════════════════════════════════════════════════
  // HISTORIAL DE REVISIONES
  // ════════════════════════════════════════════════════════════════

  async findRevisiones(solicitudId: number): Promise<RevisionInforme[]> {
    return this.revisionRepo.find({
      where: { solicitud_informe_id: solicitudId },
      relations: ['revisor', 'estado'],
      order: { fecha_revision: 'DESC' },
    });
  }

  // ════════════════════════════════════════════════════════════════
  // CATÁLOGOS
  // ════════════════════════════════════════════════════════════════

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