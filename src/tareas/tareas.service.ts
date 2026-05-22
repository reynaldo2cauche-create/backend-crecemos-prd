import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';

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
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepo: Repository<TrabajadorCentro>,
    private notificacionesService: NotificacionesService,
  ) {}

  // ─── Init: programa timeouts para tareas pendientes al arrancar el servidor ──

  async onModuleInit() {
    // Self-healing: add columna_id to tarea_asignaciones if it doesn't exist
    try {
      await this.asignacionRepo.query(
        'ALTER TABLE tarea_asignaciones ADD COLUMN columna_id INT NULL DEFAULT NULL',
      );
    } catch (e) {
      if (!String(e?.message).includes('Duplicate column name')) {
        console.warn('[TareasService] Migration warning:', e?.message);
      }
    }

    const tareas = await this.tareaRepo.find({ where: { archivado: false } });
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
      if (!tareaActual || tareaActual.archivado) return;

      const [asignaciones, columnasFinales] = await Promise.all([
        this.asignacionRepo.find({ where: { tarea_id: tarea.id } }),
        this.columnaRepo.find({ where: { es_final: true } }),
      ]);
      const finalesIds = new Set(columnasFinales.map(c => c.id));

      // Only notify users who haven't moved their task to a final column yet
      const pendientes = asignaciones.filter(a => {
        const colId = a.columna_id ?? tareaActual.columna_id;
        return !finalesIds.has(colId);
      });

      if (!pendientes.length) return;

      await this.notificacionesService.notificarTareaVencida(
        tarea.id,
        tarea.titulo,
        pendientes.map(a => ({ usuario_id: a.usuario_id ?? undefined })),
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
    const nombre = col.nombre;
    await this.columnaRepo.remove(col);
    return { message: 'Columna eliminada', nombre };
  }

  // ─── Tareas ─────────────────────────────────────────────────────────────────

  async reordenarTareas(ids: number[], userId: number) {
    await Promise.all(ids.map((id, i) =>
      this.tareaRepo.update(id, { orden: i, user_actua_id: userId })
    ));
    return { ok: true };
  }

  async listar(userId: number, rolId: number) {
    const [todas, todosTimers] = await Promise.all([
      this.tareaRepo.find({ where: { archivado: false }, order: { orden: 'ASC', created_at: 'DESC' } }),
      this.timerRepo.find(),
    ]);

    // Separar: mi timer por tarea  |  tiempo acumulado de otros usuarios por tarea
    const miTimerMap = new Map<number, TareaTimer>();
    const tiempoOtrosMap = new Map<number, number>();

    for (const t of todosTimers) {
      let elapsed = t.tiempo_acumulado || 0;
      if (t.timer_activo && t.timer_inicio) {
        elapsed += Math.floor((Date.now() - new Date(t.timer_inicio).getTime()) / 1000);
      }
      if (t.usuario_id === userId) {
        miTimerMap.set(t.tarea_id, t);
      } else {
        tiempoOtrosMap.set(t.tarea_id, (tiempoOtrosMap.get(t.tarea_id) ?? 0) + elapsed);
      }
    }

    const agregarTimer = (t: Tarea) => ({
      ...t,
      mi_timer: miTimerMap.get(t.id) ?? null,
      tiempo_otros: tiempoOtrosMap.get(t.id) ?? 0,
    });

    // Admin ve todas las tareas
    if (rolId === ROL_ADMIN) {
      return todas.map(agregarTimer);
    }

    // Cargar asignaciones por usuario Y por rol
    const [asignacionesUsuario, asignacionesRol] = await Promise.all([
      this.asignacionRepo.find({ where: { usuario_id: userId } }),
      rolId ? this.asignacionRepo.find({ where: { rol_id: rolId } }) : Promise.resolve([]),
    ]);

    // Visible: asignadas al usuario, a su rol, O creadas por él
    const tareaIdsVisibles = new Set([
      ...asignacionesUsuario.map(a => a.tarea_id),
      ...asignacionesRol.map(a => a.tarea_id),
      ...todas.filter(t => t.user_crea_id === userId).map(t => t.id),
    ]);

    return todas
      .filter(t => tareaIdsVisibles.has(t.id))
      .map(agregarTimer);
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

    const asignacionesAGuardar = dto.asignaciones?.length
      ? dto.asignaciones
      : [{ usuario_id: userId }]; // sin asignación explícita → tarea para el creador

    await this.guardarAsignaciones(tareaGuardada.id, asignacionesAGuardar, userId);

    if (dto.asignaciones?.length) {
      const asignacionesGuardadas = await this.asignacionRepo.find({ where: { tarea_id: tareaGuardada.id } });
      await this.notificacionesService.notificarTareaAsignada(
        tareaGuardada.id, dto.titulo, userId,
        asignacionesGuardadas.map(a => ({ usuario_id: a.usuario_id ?? undefined })),
      ).catch(() => {});
    }

    const tareaFinal = await this.obtenerPorId(tareaGuardada.id);
    this.programarNotificacionVencida(tareaFinal);
    return tareaFinal;
  }

  async actualizar(id: number, dto: UpdateTareaDto, userId: number) {
    // Capturar estado antes de actualizar para auditoría
    const tareaAntes = await this.obtenerPorId(id);
    const [columnaAntes, prioridadAntes] = await Promise.all([
      tareaAntes?.columna_id ? this.columnaRepo.findOne({ where: { id: tareaAntes.columna_id } }) : Promise.resolve(null),
      tareaAntes?.prioridad_id ? this.prioridadRepo.findOne({ where: { id: tareaAntes.prioridad_id } }) : Promise.resolve(null),
    ]);
    const datosAnteriores = {
      titulo: tareaAntes?.titulo,
      descripcion: tareaAntes?.descripcion,
      columna: columnaAntes?.nombre,
      prioridad: prioridadAntes?.nombre,
      prioridad_id: tareaAntes?.prioridad_id,
      fecha_limite: tareaAntes?.fecha_limite,
    };

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
        const [tareaActual, nuevasAsig] = await Promise.all([
          this.tareaRepo.findOne({ where: { id } }),
          this.asignacionRepo.find({ where: { tarea_id: id } }),
        ]);
        if (tareaActual) {
          this.notificacionesService.notificarTareaAsignada(
            id, tareaActual.titulo, userId,
            nuevasAsig.map(a => ({ usuario_id: a.usuario_id ?? undefined })),
          ).catch(() => {});
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
    const [columnaNueva, prioridadNueva] = await Promise.all([
      tareaActualizada?.columna_id ? this.columnaRepo.findOne({ where: { id: tareaActualizada.columna_id } }) : Promise.resolve(null),
      tareaActualizada?.prioridad_id ? this.prioridadRepo.findOne({ where: { id: tareaActualizada.prioridad_id } }) : Promise.resolve(null),
    ]);
    return {
      ...tareaActualizada,
      columna: columnaNueva,
      prioridad: prioridadNueva,
      datosAnteriores,
    };
  }

  async moverColumna(id: number, columnaId: number, userId: number, rolId?: number) {
    const columna = await this.columnaRepo.findOne({ where: { id: columnaId } });
    if (!columna) throw new NotFoundException(`Columna #${columnaId} no encontrada`);

    const tarea = await this.obtenerPorId(id);

    // Siempre actualizar columna global — no hay tracking individual
    const updateData: Record<string, any> = { columna_id: columnaId, user_actua_id: userId };
    if (columna.es_final) {
      if (tarea.timer_activo) {
        updateData.tiempo_acumulado = this.calcularTiempoAcumulado(tarea);
        updateData.timer_activo = false;
        updateData.timer_inicio = null;
      }
      updateData.fecha_completado = new Date();
    } else {
      updateData.fecha_completado = null;
    }
    await this.tareaRepo.update(id, updateData);

    const asignaciones = await this.asignacionRepo.find({ where: { tarea_id: id } });
    const asigDtos = asignaciones.map(a => ({ usuario_id: a.usuario_id ?? undefined }));

    if (columna.es_final) {
      this.notificacionesService.notificarTareaCompletada(
        id, tarea.titulo, userId, tarea.user_crea_id, asigDtos,
      ).catch(() => {});
      if (await this.verificarTodasEnFinal(id)) this.cancelarTimeoutVencida(id);
    } else {
      this.notificacionesService.notificarTareaMovida(
        id, tarea.titulo, userId, tarea.user_crea_id, columna.nombre, asigDtos,
      ).catch(() => {});
    }

    return this.obtenerPorId(id);
  }

  private async verificarTodasEnFinal(tareaId: number): Promise<boolean> {
    const [tarea, columnasFinales] = await Promise.all([
      this.tareaRepo.findOne({ where: { id: tareaId } }),
      this.columnaRepo.find({ where: { es_final: true } }),
    ]);
    if (!tarea) return true;
    return new Set(columnasFinales.map(c => c.id)).has(tarea.columna_id);
  }

  async eliminar(id: number) {
    const tarea = await this.obtenerPorId(id);
    const titulo = tarea.titulo;
    this.cancelarTimeoutVencida(tarea.id);
    await this.tareaRepo.remove(tarea);
    return { message: 'Tarea eliminada correctamente', titulo };
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
    const tarea = await this.tareaRepo.findOne({ where: { id: comentario.tarea_id }, select: ['id', 'titulo'] });
    await this.comentarioRepo.remove(comentario);
    return { message: 'Comentario eliminado', tarea: tarea ? { titulo: tarea.titulo } : null };
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
      this.notificacionesService.notificarTareaArchivoSubido(
        tareaId, tarea.titulo, userId,
        (tarea.asignaciones ?? []).map(a => ({ usuario_id: a.usuario_id ?? undefined })),
        tarea.user_crea_id ?? undefined,
      ).catch(() => {});
    } else {
      this.notificacionesService.notificarTareaComentada(
        tareaId, tarea.titulo, userId,
        (tarea.asignaciones ?? []).map(a => ({ usuario_id: a.usuario_id ?? undefined })),
        tarea.user_crea_id ?? undefined,
      ).catch(() => {});
    }
    const comentarioGuardado = await this.comentarioRepo.findOne({ where: { id: comentario.id } });
    return { ...comentarioGuardado, tarea: { titulo: tarea.titulo } };
  }

  // ─── Archivos ───────────────────────────────────────────────────────────────

  async listarArchivos(tareaId: number): Promise<TareaArchivo[]> {
    return this.archivoRepo.find({
      where: { tarea_id: tareaId },
      order: { created_at: 'ASC' },
    });
  }

  async guardarArchivo(tareaId: number, file: Express.Multer.File, userId: number, skipNotification = false): Promise<TareaArchivo> {
    const tarea = await this.obtenerPorId(tareaId);
    const archivo = this.archivoRepo.create({
      tarea_id: tareaId,
      nombre_original: file.originalname,
      nombre_guardado: file.filename,
      url: `/backend_api/tareas/archivos/file/${file.filename}`,
      tipo_mime: file.mimetype,
      tamanio: file.size,
      user_crea_id: userId,
    });
    const guardado = await this.archivoRepo.save(archivo);
    if (!skipNotification) {
      const asignaciones = await this.asignacionRepo.find({ where: { tarea_id: tareaId } });
      await this.notificacionesService.notificarTareaArchivoSubido(
        tareaId, tarea.titulo, userId,
        asignaciones.map(a => ({ usuario_id: a.usuario_id ?? undefined })),
        tarea.user_crea_id ?? undefined,
      ).catch(() => {});
    }
    return guardado;
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
    const entidades = [];
    const yaAgregados = new Set<number>();

    for (const a of asignaciones) {
      if (a.usuario_id) {
        if (!yaAgregados.has(a.usuario_id)) {
          yaAgregados.add(a.usuario_id);
          entidades.push(this.asignacionRepo.create({
            tarea_id: tareaId,
            usuario_id: a.usuario_id,
            rol_id: null,
            user_crea_id: userId,
            user_actua_id: userId,
          }));
        }
      } else if (a.rol_id) {
        // Resolver rol → usuarios individuales activos
        const usuarios = await this.trabajadorRepo.find({
          where: { rol: { id: a.rol_id }, estado: true },
          select: ['id'],
        });
        for (const u of usuarios) {
          if (!yaAgregados.has(u.id)) {
            yaAgregados.add(u.id);
            entidades.push(this.asignacionRepo.create({
              tarea_id: tareaId,
              usuario_id: u.id,
              rol_id: a.rol_id, // referencia al rol de origen
              user_crea_id: userId,
              user_actua_id: userId,
            }));
          }
        }
      }
    }

    if (entidades.length) await this.asignacionRepo.save(entidades);
  }

  // ─── Archivo ─────────────────────────────────────────────────────────────────

  async listarArchivadas(filtros: {
    busqueda?: string;
    desde?: string;
    hasta?: string;
    prioridad_id?: number;
    page?: number;
    limit?: number;
  } = {}) {
    const { busqueda, desde, hasta, prioridad_id, page = 1, limit = 20 } = filtros;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['t.archivado = 1'];
    const params: any[] = [];

    if (busqueda) { conditions.push('t.titulo LIKE ?'); params.push(`%${busqueda}%`); }
    if (desde)    { conditions.push('DATE(COALESCE(t.fecha_completado, t.updated_at)) >= ?'); params.push(desde); }
    if (hasta)    { conditions.push('DATE(COALESCE(t.fecha_completado, t.updated_at)) <= ?'); params.push(hasta); }
    if (prioridad_id) { conditions.push('t.prioridad_id = ?'); params.push(Number(prioridad_id)); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [[{ total }], filas] = await Promise.all([
      this.tareaRepo.query(`SELECT COUNT(*) AS total FROM tareas t ${where}`, params),
      this.tareaRepo.query(
        `SELECT t.id, t.titulo, t.descripcion, t.prioridad_id, t.fecha_completado, t.updated_at,
                p.nombre AS prioridad_nombre, p.color AS prioridad_color,
                tc.nombres AS crea_nombres, tc.apellidos AS crea_apellidos,
                col.nombre AS columna_nombre, col.color AS columna_color
         FROM tareas t
         LEFT JOIN tarea_prioridades p ON p.id = t.prioridad_id
         LEFT JOIN trabajador_centro tc ON tc.id = t.user_crea_id
         LEFT JOIN tarea_columnas col ON col.id = t.columna_id
         ${where}
         ORDER BY COALESCE(t.fecha_completado, t.updated_at) DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
    ]);

    const totalNum = parseInt(total);
    return { data: filas, total: totalNum, page, limit, totalPages: Math.ceil(totalNum / limit) };
  }

  async restaurar(id: number) {
    const tarea = await this.tareaRepo.findOne({ where: { id } });
    if (!tarea) throw new NotFoundException(`Tarea #${id} no encontrada`);

    const [primeraColumna] = await this.columnaRepo.find({ order: { orden: 'ASC' }, take: 1 });
    await this.tareaRepo.update(id, {
      archivado: false,
      fecha_completado: null,
      columna_id: primeraColumna?.id ?? tarea.columna_id,
    });
    return this.obtenerPorId(id);
  }

  async archivar(id: number) {
    const tarea = await this.tareaRepo.findOne({ where: { id } });
    if (!tarea) throw new NotFoundException(`Tarea #${id} no encontrada`);
    this.cancelarTimeoutVencida(id);
    await this.tareaRepo.update(id, { archivado: true, fecha_completado: new Date() });
    return { ok: true };
  }

}
