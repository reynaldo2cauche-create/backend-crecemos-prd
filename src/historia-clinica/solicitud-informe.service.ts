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

    try {
      const evento = await this.notificacionesService.crearEvento({
        tipo_evento: 'SOLICITUD_INFORME_CREADA',
        descripcion: `Nueva solicitud de informe asignada al especialista #${resultado.especialista_id}`,
        usuario_id:  resultado.especialista_id,
        datos_adicionales: {
          solicitud_id:            resultado.id,
          especialista_id:         resultado.especialista_id,
          terapeutas_destinatarios: [resultado.especialista_id],
        },
      });

      await this.notificacionesService.crearNotificacion({
        tipo_notificacion: 'SOLICITUD_INFORME',
        titulo:   'Nueva solicitud de informe',
        mensaje:  'Se te ha asignado una nueva solicitud de informe. Por favor, sube el archivo correspondiente.',
        evento_id: evento.id,
        roles_destino: [ROL_TERAPEUTA],
      });
    } catch (err) {
      console.error('⚠️  Error al enviar notificación a terapeuta:', err);
    }

    return resultado;
  }

  async findAll(): Promise<SolicitudInforme[]> {
    return this.solicitudRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.tipo_archivo',     'tipo_archivo')
      .leftJoinAndSelect('si.especialista',     'especialista')
      .leftJoinAndSelect('especialista.cargo',  'cargo')        // cargo.es_jefe
      .leftJoinAndSelect('si.modalidad_pago',   'modalidad_pago')
      .leftJoinAndSelect('si.estado_pago',      'estado_pago')
      .leftJoinAndSelect('si.estado_solicitud', 'estado_solicitud')
      .leftJoinAndSelect('si.revisor',          'revisor')
      .leftJoinAndSelect('si.venta_servicio',   'venta_servicio')
      .orderBy('si.fecha_solicitud', 'DESC')
      .getMany();
  }

  /**
   * findOne usa QueryBuilder para cargar especialista → cargo (con es_jefe).
   * Los métodos del workflow lo llaman internamente, así que también obtienen el cargo.
   */
  async findOne(id: number): Promise<SolicitudInforme> {
    const s = await this.solicitudRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.tipo_archivo',        'tipo_archivo')
      .leftJoinAndSelect('si.especialista',        'especialista')
      .leftJoinAndSelect('especialista.cargo',     'cargo')       // cargo.es_jefe
      .leftJoinAndSelect('si.modalidad_pago',      'modalidad_pago')
      .leftJoinAndSelect('si.estado_pago',         'estado_pago')
      .leftJoinAndSelect('si.estado_solicitud',    'estado_solicitud')
      .leftJoinAndSelect('si.revisor',             'revisor')
      .leftJoinAndSelect('si.venta_servicio',      'venta_servicio')
      .leftJoinAndSelect('venta_servicio.paciente','paciente')
      .where('si.id = :id', { id })
      .getOne();

    if (!s) throw new NotFoundException(`Solicitud de informe #${id} no encontrada`);
    return s;
  }

  /**
   * Solicitudes de un paciente.
   * Incluye especialista → cargo para que el front pueda leer cargo.es_jefe
   * y mostrar el botón "Revisar" cuando corresponde.
   */
  async findByPaciente(pacienteId: number): Promise<SolicitudInforme[]> {
    return this.solicitudRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.servicio',            'servicio')
      .leftJoinAndSelect('si.tipo_archivo',        'tipo_archivo')
      .leftJoinAndSelect('si.especialista',        'especialista')
      .leftJoinAndSelect('especialista.cargo',     'cargo')       // cargo.es_jefe
      .leftJoinAndSelect('si.modalidad_pago',      'modalidad_pago')
      .leftJoinAndSelect('si.estado_pago',         'estado_pago')
      .leftJoinAndSelect('si.estado_solicitud',    'estado_solicitud')
      .leftJoinAndSelect('si.revisor',             'revisor')
      .leftJoinAndSelect('si.venta_servicio',      'venta_servicio')
      .leftJoinAndSelect('venta_servicio.paciente','paciente')
      .where('paciente.id = :pacienteId', { pacienteId })
      .orderBy('si.fecha_solicitud', 'DESC')
      .getMany();
  }

  async findByEspecialista(especialistaId: number): Promise<SolicitudInforme[]> {
    return this.solicitudRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.tipo_archivo',    'tipo_archivo')
      .leftJoinAndSelect('si.especialista',    'especialista')
      .leftJoinAndSelect('especialista.cargo', 'cargos')         // cargo.es_jefe
      .leftJoinAndSelect('si.estado_solicitud','estado_solicitud')
      .where('si.especialista_id = :especialistaId', { especialistaId })
      .orderBy('si.fecha_solicitud', 'DESC')
      .getMany();
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

  async subirArchivo(id: number, dto: SubirArchivoDto): Promise<SolicitudInforme> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado_solicitud_id === ESTADO_SOLICITUD.APROBADO) {
      throw new BadRequestException('El informe ya fue aprobado y no puede modificarse.');
    }
    if (solicitud.estado_solicitud_id === ESTADO_SOLICITUD.ENTREGADO) {
      throw new BadRequestException('El informe ya fue entregado al paciente.');
    }

    solicitud.archivo_url          = dto.archivo_url;
    solicitud.fecha_subida_archivo = new Date();
    solicitud.estado_solicitud_id  = ESTADO_SOLICITUD.PENDIENTE_REVISION;
    if (dto.user_actua_id) solicitud.user_actua_id = dto.user_actua_id;

    const resultado = await this.solicitudRepo.save(solicitud);

    try {
      const evento = await this.notificacionesService.crearEvento({
        tipo_evento: 'INFORME_PENDIENTE_REVISION',
        descripcion: `Informe subido para revisión - solicitud #${id}`,
        usuario_id:  dto.user_actua_id ?? solicitud.especialista_id,
        datos_adicionales: {
          solicitud_id:    id,
          especialista_id: solicitud.especialista_id,
        },
      });

      await this.notificacionesService.crearNotificacion({
        tipo_notificacion: 'SOLICITUD_INFORME',
        titulo:   'Informe listo para revisión',
        mensaje:  `La terapeuta subió el informe de la solicitud #${id}. Está pendiente de tu revisión.`,
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

    const revision = this.revisionRepo.create({
      solicitud_informe_id: id,
      revisor_id:           dto.revisor_id,
      estado_id:            dto.estado_id,
      comentario:           dto.comentario ?? null,
      fecha_revision:       new Date(),
    });
    await this.revisionRepo.save(revision);

    solicitud.estado_solicitud_id = dto.estado_id;
    solicitud.fecha_revision      = new Date();
    solicitud.revisor_id          = dto.revisor_id;
    const resultado = await this.solicitudRepo.save(solicitud);

    try {
      if (dto.estado_id === ESTADO_SOLICITUD.RECHAZADO) {
        const evento = await this.notificacionesService.crearEvento({
          tipo_evento: 'INFORME_RECHAZADO',
          descripcion: `Informe de solicitud #${id} rechazado por revisor`,
          usuario_id:  dto.revisor_id,
          datos_adicionales: {
            solicitud_id:            id,
            especialista_id:         solicitud.especialista_id,
            comentario:              dto.comentario,
            terapeutas_destinatarios: [solicitud.especialista_id],
          },
        });

        await this.notificacionesService.crearNotificacion({
          tipo_notificacion: 'SOLICITUD_INFORME',
          titulo:   'Informe rechazado – requiere correcciones',
          mensaje:  `Tu informe de la solicitud #${id} fue rechazado. Comentario: "${dto.comentario}". Por favor, corrígelo y vuelve a subir el archivo.`,
          evento_id: evento.id,
          roles_destino: [ROL_TERAPEUTA],
        });
      } else {
        const evento = await this.notificacionesService.crearEvento({
          tipo_evento: 'INFORME_APROBADO',
          descripcion: `Informe de solicitud #${id} aprobado, listo para entrega`,
          usuario_id:  dto.revisor_id,
          datos_adicionales: { solicitud_id: id },
        });

        await this.notificacionesService.crearNotificacion({
          tipo_notificacion: 'SOLICITUD_INFORME',
          titulo:   'Informe aprobado – listo para entrega',
          mensaje:  `El informe de la solicitud #${id} fue aprobado. Ya puede ser entregado al paciente.`,
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
      where:     { solicitud_informe_id: solicitudId },
      relations: ['revisor', 'estado'],
      order:     { fecha_revision: 'DESC' },
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