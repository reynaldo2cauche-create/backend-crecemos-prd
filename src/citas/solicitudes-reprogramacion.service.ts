import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolicitudReprogramacion } from './entities/solicitud-reprogramacion.entity';
import { Cita } from './entities/cita.entity';
import { CitasService } from './citas.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CrearSolicitudReprogramacionDto } from './dto/crear-solicitud-reprogramacion.dto';
import { RevisarSolicitudReprogramacionDto } from './dto/revisar-solicitud-reprogramacion.dto';

const nombreTrab = (t: any): string =>
  t ? `${t.nombres || ''} ${t.apellidos || ''}`.replace(/\s+/g, ' ').trim() : '';

@Injectable()
export class SolicitudesReprogramacionService {
  constructor(
    @InjectRepository(SolicitudReprogramacion)
    private readonly repo: Repository<SolicitudReprogramacion>,
    @InjectRepository(Cita)
    private readonly citaRepo: Repository<Cita>,
    private readonly citasService: CitasService,
    @Inject(forwardRef(() => NotificacionesService))
    private readonly notificacionesService: NotificacionesService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /** Admisión genera la solicitud con los cambios propuestos. */
  async crear(dto: CrearSolicitudReprogramacionDto): Promise<SolicitudReprogramacion> {
    const cita = await this.citaRepo.findOne({
      where: { id: dto.cita_id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo'],
    });
    if (!cita) {
      throw new NotFoundException(`Cita ${dto.cita_id} no encontrada`);
    }

    // Evitar solicitudes pendientes duplicadas para la misma cita
    const pendiente = await this.repo.findOne({
      where: { cita_id: dto.cita_id, estado: 'pendiente' },
    });
    if (pendiente) {
      throw new BadRequestException(
        'Ya existe una solicitud de reprogramación pendiente para esta cita.',
      );
    }

    const nombrePaciente = cita.paciente
      ? `${cita.paciente.nombres || ''} ${cita.paciente.apellido_paterno || ''} ${cita.paciente.apellido_materno || ''}`.replace(/\s+/g, ' ').trim()
      : null;
    const nombreDoctorAnt = cita.doctor
      ? `${cita.doctor.nombres || ''} ${cita.doctor.apellidos || ''}`.replace(/\s+/g, ' ').trim()
      : null;

    const solicitud = this.repo.create({
      cita_id: dto.cita_id,
      paciente_id: dto.paciente_id ?? cita.paciente_id ?? null,
      paciente_nombre: nombrePaciente,
      user_crea_id: dto.solicitante_id ?? null,
      motivo: dto.motivo,

      // Snapshot "anterior" tomado de la cita real (no se confía al frontend)
      fecha_anterior: (cita.fecha as any) ?? null,
      hora_inicio_anterior: cita.hora_inicio ?? null,
      doctor_nombre_anterior: nombreDoctorAnt,
      servicio_nombre_anterior: cita.servicio?.nombre ?? null,
      motivo_cita_anterior: cita.motivo?.nombre ?? null,

      // Cambios propuestos (display)
      fecha_nueva: dto.fecha_nueva ?? null,
      hora_inicio_nueva: dto.hora_inicio_nueva ?? null,
      hora_fin_nueva: dto.hora_fin_nueva ?? null,
      doctor_nombre_nuevo: dto.doctor_nombre_nuevo ?? null,
      servicio_nombre_nuevo: dto.servicio_nombre_nuevo ?? null,
      motivo_cita_nuevo: dto.motivo_cita_nuevo ?? null,

      payload_json: JSON.stringify(dto.payload || {}),
      estado: 'pendiente',
    });

    const guardada = await this.repo.save(solicitud);
    console.log(`🔁 Solicitud de reprogramación creada #${guardada.id} (cita ${dto.cita_id}) por user ${dto.solicitante_id}`);

    // 📋 Auditoría (no lanza; es seguro)
    const resumenAud = `${this.aFechaStr(guardada.fecha_anterior)} ${(guardada.hora_inicio_anterior || '').slice(0, 5)} -> ${this.aFechaStr(guardada.fecha_nueva)} ${(guardada.hora_inicio_nueva || '').slice(0, 5)}`;
    await this.auditoriaService.registrar({
      trabajadorId: dto.solicitante_id,
      accion: 'CREAR_SOLICITUD_REPROGRAMACION',
      modulo: 'CITAS',
      descripcion: `Solicitó reprogramar la cita #${dto.cita_id} de ${nombrePaciente || 's/n'} (${resumenAud}). Pendiente de aprobacion (solicitud #${guardada.id})`,
      datosNuevos: {
        solicitud_id: guardada.id,
        cita_id: dto.cita_id,
        paciente: nombrePaciente,
        motivo: dto.motivo,
        fecha_nueva: guardada.fecha_nueva,
        hora_inicio_nueva: guardada.hora_inicio_nueva,
        doctor_nombre_nuevo: guardada.doctor_nombre_nuevo,
        servicio_nombre_nuevo: guardada.servicio_nombre_nuevo,
        motivo_cita_nuevo: guardada.motivo_cita_nuevo,
      },
    });

    // 🔔 Avisar al Administrador (background, no rompe el registro)
    try {
      if (!this.notificacionesService) {
        console.error('⚠️ notificacionesService es undefined — no se notificará');
      } else {
        const full = await this.repo.findOne({ where: { id: guardada.id } });
        const resumen = `${this.aFechaStr(full?.fecha_anterior)} ${(full?.hora_inicio_anterior || '').slice(0, 5)} -> ${this.aFechaStr(full?.fecha_nueva)} ${(full?.hora_inicio_nueva || '').slice(0, 5)}`;
        await this.notificacionesService.notificarNuevaSolicitudReprogramacion(
          guardada.id,
          dto.solicitante_id,
          nombreTrab(full?.solicitante) || 'Admisión',
          nombrePaciente || `Cita #${dto.cita_id}`,
          resumen,
          dto.motivo,
        );
        console.log(`🔔 Notificación de nueva solicitud #${guardada.id} enviada al rol Administrador`);
      }
    } catch (e) {
      console.error('❌ No se pudo notificar nueva solicitud de reprogramación:', e);
    }

    return guardada;
  }

  private aFechaStr(f: any): string {
    if (!f) return '—';
    const s = String(f).slice(0, 10).split('-');
    return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : String(f);
  }

  /** Listado para el Administrador. Filtro opcional ?estado= */
  findAll(estado?: string): Promise<SolicitudReprogramacion[]> {
    const where = estado ? { estado } : {};
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  /** Última solicitud de una cita (para mostrar su estado/respuesta en el modal). */
  findUltimaPorCita(citaId: number): Promise<SolicitudReprogramacion | null> {
    return this.repo.findOne({ where: { cita_id: citaId }, order: { created_at: 'DESC' } });
  }

  async findOne(id: number): Promise<SolicitudReprogramacion> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException(`Solicitud ${id} no encontrada`);
    return s;
  }

  /** Cantidad de pendientes (para el badge del menú). */
  async pendientesCount(): Promise<{ total: number }> {
    const total = await this.repo.count({ where: { estado: 'pendiente' } });
    return { total };
  }

  /**
   * Aprueba o rechaza. Al aprobar, aplica el cambio a la cita reusando
   * CitasService.actualizar pasando al Administrador como user_id_crea
   * (así no vuelve a saltar el límite de reprogramación por paciente).
   */
  async revisar(id: number, dto: RevisarSolicitudReprogramacionDto): Promise<SolicitudReprogramacion> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestException(
        `La solicitud ya fue ${solicitud.estado}. No se puede volver a revisar.`,
      );
    }

    if (dto.estado === 'aprobada') {
      const payload: any = JSON.parse(solicitud.payload_json || '{}');
      // El Administrador revisor es quien "aplica" el cambio → evita el bloqueo
      payload.user_id_crea = dto.revisor_id ?? payload.user_id_crea;
      // El motivo de acción es obligatorio en actualizar; usamos el de la solicitud
      payload.motivo_accion =
        solicitud.motivo || payload.motivo_accion || `Reprogramación aprobada (solicitud #${id})`;

      // Si esto falla (conflictos de horario, etc.), propaga el error y la
      // solicitud queda pendiente para corregir.
      await this.citasService.actualizar(solicitud.cita_id, payload);
    }

    solicitud.estado = dto.estado;
    solicitud.user_actua_id = dto.revisor_id ?? null;
    solicitud.fecha_revision = new Date();
    solicitud.comentario_revisor = dto.comentario ?? null;

    const guardada = await this.repo.save(solicitud);

    // 📋 Auditoría de la respuesta (no lanza)
    if (dto.revisor_id) {
      await this.auditoriaService.registrar({
        trabajadorId: dto.revisor_id,
        accion: dto.estado === 'aprobada' ? 'APROBAR_SOLICITUD_REPROGRAMACION' : 'RECHAZAR_SOLICITUD_REPROGRAMACION',
        modulo: 'CITAS',
        descripcion: `${dto.estado === 'aprobada' ? 'Aprobo' : 'Rechazo'} la solicitud de reprogramación #${guardada.id} de ${solicitud.paciente_nombre || 's/n'} (cita #${solicitud.cita_id})${dto.comentario ? ` - ${dto.comentario}` : ''}`,
        datosNuevos: {
          solicitud_id: guardada.id,
          cita_id: solicitud.cita_id,
          estado: dto.estado,
          comentario: dto.comentario || null,
          solicitante_id: solicitud.user_crea_id,
        },
      });
    }

    // 🔔 Avisar al solicitante (Admisión) la respuesta (background)
    try {
      const full = await this.repo.findOne({ where: { id: guardada.id } });
      if (solicitud.user_crea_id) {
        await this.notificacionesService.notificarRespuestaReprogramacion(
          guardada.id,
          solicitud.user_crea_id,
          solicitud.paciente_nombre || `Cita #${solicitud.cita_id}`,
          dto.estado,
          nombreTrab(full?.revisor) || 'El Administrador',
          dto.comentario || undefined,
        );
      }
    } catch (e) {
      console.error('No se pudo notificar respuesta de reprogramación:', e?.message);
    }

    return guardada;
  }

  async remove(id: number): Promise<void> {
    const s = await this.findOne(id);
    await this.repo.remove(s);
  }
}
