import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Tarea } from './entities/tarea.entity';
import { TareaAsignacion } from './entities/tarea-asignacion.entity';
import { TareaComentario } from './entities/tarea-comentario.entity';
import { TareaPrioridad } from './entities/tarea-prioridad.entity';
import { TareaColumna } from './entities/tarea-columna.entity';
import { TareaArchivo } from './entities/tarea-archivo.entity';
import { TareaComentarioArchivo } from './entities/tarea-comentario-archivo.entity';
import { TareaTimer } from './entities/tarea-timer.entity';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const ROL_ADMIN = 1;

@Injectable()
export class TareasService implements OnModuleInit {
  private timeoutsVencidas = new Map<number, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Tarea)
    private tareaRepo: Repository<Tarea>,
    @InjectRepository(TareaAsignacion)
    private asignacionRepo: Repository<TareaAsignacion>,
    @InjectRepository(TareaComentario)
    private comentarioRepo: Repository<TareaComentario>,
    @InjectRepository(TareaPrioridad)
    private prioridadRepo: Repository<TareaPrioridad>,
    @InjectRepository(TareaColumna)
    private columnaRepo: Repository<TareaColumna>,
    @InjectRepository(TareaArchivo)
    private archivoRepo: Repository<TareaArchivo>,
    @InjectRepository(TareaComentarioArchivo)
    private comentarioArchivoRepo: Repository<TareaComentarioArchivo>,
    @InjectRepository(TareaTimer)
    private timerRepo: Repository<TareaTimer>,
    private notificacionesService: NotificacionesService,
  ) {}

  // ─── Init: programa timeouts para tareas pendientes al arrancar el servidor ──

  async onModuleInit() {
    const tareas = await this.tareaRepo.find();
    for (const tarea of tareas) {
      if (tarea.fecha_limite && !tarea.columna?.es_final) {
        this.programarNotificacionVencida(tarea);
      }
    }
  }

  // ─── Timeout exacto al vencer ────────────────────────────────────────────────

  private programarNotificacionVencida(tarea: Tarea) {
    if (this.timeoutsVencidas.has(tarea.id)) {
      clearTimeout(this.timeoutsVencidas.get(tarea.id));
      this.timeoutsVencidas.delete(tarea.id);
    }
    if (!tarea.fecha_limite) return;

    const ms = new Date(tarea.fecha_limite).getTime() - Date.now();
    if (ms <= 0) return; // ya venció — el scheduler de 5 min lo cubre

    const timeout = setTimeout(async () => {
      this.timeoutsVencidas.delete(tarea.id);
      const tareaActual = await this.tareaRepo.findOne({ where: { id: tarea.id } });
      if (!tareaActual || tareaActual.columna?.es_final) return;
      const asignaciones = await this.asignacionRepo.find({ where: { tarea_id: tarea.id } });
      await this.notificacionesService.notificarTareaVencida(
        tarea.id,
        tarea.titulo,
        asignaciones.map(a => ({ usuario_id: a.usuario_id ?? undefined, rol_id: a.rol_id ?? undefined })),
        tarea.user_crea_id,
      );
    }, ms);

    this.timeoutsVencidas.set(tarea.id, timeout);
  }

  private cancelarTimeoutVencida(tareaId: number) {
    if (this.timeoutsVencidas.has(tareaId)) {
      clearTimeout(this.timeoutsVencidas.get(tareaId));
      this.timeoutsVencidas.delete(tareaId);
    }
  }

  // ─── Catálogos ──────────────────────────────────────────────────────────────

  async listarPrioridades() {
    return this.prioridadRepo.find({ order: { orden: 'ASC' } });
  }

  async listarColumnas() {
    return this.columnaRepo.find({ order: { orden: 'ASC' } });
  }

  async crearColumna(datos: { nombre: string; color: string; es_final: boolean }, userId: number) {
    const maxOrden = await this.columnaRepo.maximum('orden') ?? 0;
    const col = this.columnaRepo.create({
      nombre: datos.nombre,
      color: datos.color,
      es_final: datos.es_final,
      orden: maxOrden + 1,
      user_crea_id: userId,
      user_actua_id: userId,
    });
    return this.columnaRepo.save(col);
  }

  async reordenarColumnas(ids: number[], userId: number) {
    await Promise.all(ids.map((id, i) =>
      this.columnaRepo.update(id, { orden: i + 1, user_actua_id: userId })
    ));
    return this.listarColumnas();
  }

  async eliminarColumna(id: number) {
    const col = await this.columnaRepo.findOne({ where: { id } });
    if (!col) throw new NotFoundException(`Columna #${id} no encontrada`);
    const tareasEnColumna = await this.tareaRepo.count({ where: { columna_id: id } });
    if (tareasEnColumna > 0) throw new BadRequestException('No se puede eliminar una columna que tiene tareas asignadas');
    await this.columnaRepo.remove(col);
    return { message: 'Columna eliminada' };
  }

  // ─── Tareas ─────────────────────────────────────────────────────────────────

  async reordenarTareas(ids: number[], userId: number) {
    await Promise.all(ids.map((id, i) =>
      this.tareaRepo.update(id, { orden: i, user_actua_id: userId })
    ));
    return { ok: true };
  }

  async listar(userId: number, rolId: number) {
    const todas = await this.tareaRepo.find({
      order: { orden: 'ASC', created_at: 'DESC' },
    });

    // Cargar timers del usuario actual para todas las tareas
    const misTimers = await this.timerRepo.find({ where: { usuario_id: userId } });
    const timerMap = new Map(misTimers.map(t => [t.tarea_id, t]));

    const conTimer = todas.map(t => ({
      ...t,
      mi_timer: timerMap.get(t.id) ?? null,
    }));

    // Administrador ve todo
    if (rolId === ROL_ADMIN) return conTimer;

    // Otros: solo tareas asignadas a su usuario o su rol
    return conTimer.filter(t =>
      t.asignaciones?.some(a =>
        (a.usuario_id && a.usuario_id === userId) ||
        (a.rol_id && a.rol_id === rolId)
      )
    );
  }

  async obtenerPorId(id: number) {
    const tarea = await this.tareaRepo.findOne({ where: { id } });
    if (!tarea) throw new NotFoundException(`Tarea #${id} no encontrada`);
    return tarea;
  }

  async crear(dto: CreateTareaDto, userId: number) {
    const tarea = this.tareaRepo.create({
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      prioridad_id: dto.prioridad_id ?? 2,
      columna_id: dto.columna_id ?? 1,
      fecha_limite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      user_crea_id: userId,
      user_actua_id: userId,
    });

    const tareaGuardada = await this.tareaRepo.save(tarea);

    if (dto.asignaciones?.length) {
      await this.guardarAsignaciones(tareaGuardada.id, dto.asignaciones, userId);
      this.notificacionesService.notificarTareaAsignada(tareaGuardada.id, dto.titulo, userId, dto.asignaciones).catch(() => {});
    }

    const tareaFinal = await this.obtenerPorId(tareaGuardada.id);
    this.programarNotificacionVencida(tareaFinal);
    return tareaFinal;
  }

  async actualizar(id: number, dto: UpdateTareaDto, userId: number) {
    const updateData: Record<string, any> = { user_actua_id: userId };

    if (dto.titulo) updateData.titulo = dto.titulo;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.prioridad_id) updateData.prioridad_id = dto.prioridad_id;
    if (dto.columna_id) updateData.columna_id = dto.columna_id;
    if (dto.fecha_limite !== undefined) updateData.fecha_limite = dto.fecha_limite ? new Date(dto.fecha_limite) : null;

    // Si la nueva columna es final, pausar timer
    if (dto.columna_id) {
      const columna = await this.columnaRepo.findOne({ where: { id: dto.columna_id } });
      if (columna?.es_final) {
        const tarea = await this.obtenerPorId(id);
        if (tarea.timer_activo) {
          updateData.tiempo_acumulado = this.calcularTiempoAcumulado(tarea);
          updateData.timer_activo = false;
          updateData.timer_inicio = null;
        }
      }
    }

    await this.tareaRepo.update(id, updateData);

    if (dto.asignaciones !== undefined) {
      await this.asignacionRepo.delete({ tarea_id: id });
      if (dto.asignaciones.length) {
        await this.guardarAsignaciones(id, dto.asignaciones, userId);
        const tareaActual = await this.tareaRepo.findOne({ where: { id } });
        if (tareaActual) {
          this.notificacionesService.notificarTareaAsignada(id, tareaActual.titulo, userId, dto.asignaciones).catch(() => {});
        }
      }
    }

    // Notificar al creador si la tarea se movió a columna final
    if (dto.columna_id) {
      const col = await this.columnaRepo.findOne({ where: { id: dto.columna_id } });
      if (col?.es_final) {
        const t = await this.tareaRepo.findOne({ where: { id } });
        if (t?.user_crea_id) {
          this.notificacionesService.notificarTareaCompletada(id, t.titulo, userId, t.user_crea_id).catch(() => {});
        }
        this.cancelarTimeoutVencida(id);
      }
    }

    const tareaActualizada = await this.obtenerPorId(id);
    this.programarNotificacionVencida(tareaActualizada);
    return tareaActualizada;
  }

  async moverColumna(id: number, columnaId: number, userId: number) {
    const columna = await this.columnaRepo.findOne({ where: { id: columnaId } });
    if (!columna) throw new NotFoundException(`Columna #${columnaId} no encontrada`);

    const updateData: Record<string, any> = { columna_id: columnaId, user_actua_id: userId };

    // Si la columna destino es final, pausar timer
    if (columna.es_final) {
      const tarea = await this.obtenerPorId(id);
      if (tarea.timer_activo) {
        updateData.tiempo_acumulado = this.calcularTiempoAcumulado(tarea);
        updateData.timer_activo = false;
        updateData.timer_inicio = null;
      }
      if (tarea.user_crea_id) {
        this.notificacionesService.notificarTareaCompletada(id, tarea.titulo, userId, tarea.user_crea_id).catch(() => {});
      }
      this.cancelarTimeoutVencida(id);
    }

    await this.tareaRepo.update(id, updateData);
    return this.obtenerPorId(id);
  }

  async eliminar(id: number) {
    const tarea = await this.obtenerPorId(id);
    this.cancelarTimeoutVencida(tarea.id);
    await this.tareaRepo.remove(tarea);
    return { message: 'Tarea eliminada correctamente' };
  }

  // ─── Timer por usuario ───────────────────────────────────────────────────────

  private async validarAsignacion(tareaId: number, userId: number, rolId: number) {
    const asignacion = await this.asignacionRepo.findOne({
      where: [
        { tarea_id: tareaId, usuario_id: userId },
        { tarea_id: tareaId, rol_id: rolId },
      ],
    });
    if (!asignacion) throw new BadRequestException('No tienes asignada esta tarea');
  }

  async iniciarTimer(tareaId: number, userId: number, rolId: number) {
    await this.obtenerPorId(tareaId);
    await this.validarAsignacion(tareaId, userId, rolId);

    let timer = await this.timerRepo.findOne({ where: { tarea_id: tareaId, usuario_id: userId } });
    if (timer?.timer_activo) throw new BadRequestException('El timer ya está activo');

    if (!timer) {
      timer = this.timerRepo.create({ tarea_id: tareaId, usuario_id: userId, tiempo_acumulado: 0 });
    }
    timer.timer_activo = true;
    timer.timer_inicio = new Date();
    return this.timerRepo.save(timer);
  }

  async pausarTimer(tareaId: number, userId: number, rolId: number) {
    await this.validarAsignacion(tareaId, userId, rolId);

    const timer = await this.timerRepo.findOne({ where: { tarea_id: tareaId, usuario_id: userId } });
    if (!timer?.timer_activo) throw new BadRequestException('El timer no está activo');

    timer.tiempo_acumulado = this.calcularTiempoAcumuladoTimer(timer);
    timer.timer_activo = false;
    timer.timer_inicio = null;
    return this.timerRepo.save(timer);
  }

  // ─── Comentarios ────────────────────────────────────────────────────────────

  async eliminarComentario(comentarioId: number, userId: number, esAdmin: boolean) {
    const comentario = await this.comentarioRepo.findOne({ where: { id: comentarioId } });
    if (!comentario) throw new NotFoundException('Comentario no encontrado');
    if (!esAdmin && comentario.user_crea_id !== userId)
      throw new BadRequestException('No tienes permiso para eliminar este comentario');
    await this.comentarioRepo.remove(comentario);
    return { message: 'Comentario eliminado' };
  }

  async listarComentarios(tareaId: number) {
    return this.comentarioRepo.find({
      where: { tarea_id: tareaId },
      order: { created_at: 'ASC' },
    });
  }

  async agregarComentario(tareaId: number, dto: CreateComentarioDto, userId: number, files?: Express.Multer.File[]) {
    const tarea = await this.obtenerPorId(tareaId);
    const comentario = await this.comentarioRepo.save(
      this.comentarioRepo.create({
        tarea_id: tareaId,
        contenido: dto.contenido?.trim() || '',
        user_crea_id: userId,
        user_actua_id: userId,
      })
    );
    if (files?.length) {
      const archivos = files.map(f => this.comentarioArchivoRepo.create({
        comentario_id: comentario.id,
        nombre_original: f.originalname,
        nombre_guardado: f.filename,
        url: `/backend_api/tareas/archivos/file/${f.filename}`,
        tipo_mime: f.mimetype,
        tamanio: f.size,
        user_crea_id: userId,
      }));
      await this.comentarioArchivoRepo.save(archivos);
    }
    this.notificacionesService.notificarTareaComentada(
      tareaId, tarea.titulo, userId,
      (tarea.asignaciones ?? []).map(a => ({ usuario_id: a.usuario_id ?? undefined, rol_id: a.rol_id ?? undefined })),
      tarea.user_crea_id ?? undefined,
    ).catch(() => {});
    return this.comentarioRepo.findOne({ where: { id: comentario.id } });
  }

  // ─── Archivos ───────────────────────────────────────────────────────────────

  async listarArchivos(tareaId: number): Promise<TareaArchivo[]> {
    return this.archivoRepo.find({
      where: { tarea_id: tareaId },
      order: { created_at: 'ASC' },
    });
  }

  async guardarArchivo(tareaId: number, file: Express.Multer.File, userId: number): Promise<TareaArchivo> {
    await this.obtenerPorId(tareaId);
    const archivo = this.archivoRepo.create({
      tarea_id: tareaId,
      nombre_original: file.originalname,
      nombre_guardado: file.filename,
      url: `/backend_api/tareas/archivos/file/${file.filename}`,
      tipo_mime: file.mimetype,
      tamanio: file.size,
      user_crea_id: userId,
    });
    return this.archivoRepo.save(archivo);
  }

  async eliminarArchivo(archivoId: number): Promise<{ message: string }> {
    const archivo = await this.archivoRepo.findOne({ where: { id: archivoId } });
    if (!archivo) throw new NotFoundException('Archivo no encontrado');
    const filePath = path.join('./uploads/tareas', archivo.nombre_guardado);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.archivoRepo.delete(archivoId);
    return { message: 'Archivo eliminado' };
  }

  // ─── Reporte mensual ────────────────────────────────────────────────────────

  async reporteMensual(mes: number, anio: number) {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 0, 23, 59, 59);

    const tareas = await this.tareaRepo
      .createQueryBuilder('t')
      .where('t.created_at BETWEEN :inicio AND :fin', { inicio, fin })
      .orderBy('t.fecha_limite', 'ASC')
      .getMany();

    const completadas = tareas.filter(t => t.columna?.es_final && t.columna?.nombre === 'Completado');
    const vencidas = tareas.filter(t => t.fecha_limite && new Date(t.fecha_limite) < new Date() && !t.columna?.es_final);
    const tiempoTotal = tareas.reduce((acc, t) => acc + (t.tiempo_acumulado || 0), 0);

    return {
      mes,
      anio,
      resumen: {
        total: tareas.length,
        completadas: completadas.length,
        vencidas: vencidas.length,
        tiempo_total_segundos: tiempoTotal,
        tiempo_total_horas: (tiempoTotal / 3600).toFixed(2),
      },
      tareas,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private calcularTiempoAcumulado(tarea: Tarea): number {
    if (!tarea.timer_inicio) return tarea.tiempo_acumulado;
    const segundosTranscurridos = Math.floor((Date.now() - new Date(tarea.timer_inicio).getTime()) / 1000);
    return tarea.tiempo_acumulado + segundosTranscurridos;
  }

  private calcularTiempoAcumuladoTimer(timer: TareaTimer): number {
    if (!timer.timer_inicio) return timer.tiempo_acumulado;
    const seg = Math.floor((Date.now() - new Date(timer.timer_inicio).getTime()) / 1000);
    return timer.tiempo_acumulado + seg;
  }

  private async guardarAsignaciones(tareaId: number, asignaciones: { usuario_id?: number; rol_id?: number }[], userId: number) {
    const entidades = asignaciones
      .filter(a => a.usuario_id || a.rol_id)
      .map(a => this.asignacionRepo.create({
        tarea_id: tareaId,
        usuario_id: a.usuario_id ?? null,
        rol_id: a.rol_id ?? null,
        user_crea_id: userId,
        user_actua_id: userId,
      }));
    await this.asignacionRepo.save(entidades);
  }
}
